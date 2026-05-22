import { createServiceClient } from "@/lib/supabase/server";
import { resolveAiModel } from "@/lib/ai-model";
import { getOpenRouterApiKey } from "@/lib/openrouter-env";
import {
  getWhatsAppAccessToken,
  getWhatsAppPhoneId,
} from "@/lib/whatsapp-env";
import {
  buildSystemPrompt,
  generateAiReply,
  shouldHandoffToHuman,
} from "@/services/ai.service";
import {
  bumpAnalytics,
  saveMessage,
  upsertContactAndConversation,
} from "@/services/message.service";
import { dispatchIntegrationWebhook } from "@/services/webhook-dispatch.service";
import {
  parseIncomingWebhook,
  sendWhatsAppText,
} from "@/services/whatsapp.service";

export interface WebhookMessageResult {
  from: string;
  contactName: string;
  content: string | null;
  conversationId?: string;
  replySent: boolean;
  replyPreview?: string;
  replySource?: "keyword" | "welcome" | "ai" | "fallback" | "none";
  skippedReason?: string;
  error?: string;
}

export interface WebhookProcessResult {
  ok: boolean;
  messagesParsed: number;
  warning?: string;
  results: WebhookMessageResult[];
  env: {
    hasPhoneId: boolean;
    hasWaToken: boolean;
    hasOpenRouter: boolean;
    aiEnabled: boolean;
  };
}

export async function processWhatsAppWebhook(
  body: unknown
): Promise<WebhookProcessResult> {
  const incoming = parseIncomingWebhook(
    body as Parameters<typeof parseIncomingWebhook>[0]
  );

  const env = {
    hasPhoneId: !!getWhatsAppPhoneId(),
    hasWaToken: !!getWhatsAppAccessToken(),
    hasOpenRouter: !!getOpenRouterApiKey(),
    aiEnabled: false,
  };

  if (!incoming.length) {
    return {
      ok: true,
      messagesParsed: 0,
      warning: "no_messages_in_payload",
      results: [],
      env,
    };
  }

  const supabase = await createServiceClient();
  const { data: businesses } = await supabase.from("businesses").select("id");

  if (!businesses?.length) {
    return {
      ok: false,
      messagesParsed: incoming.length,
      warning: "no_business",
      results: [],
      env,
    };
  }

  const businessId = businesses[0].id as string;

  const { data: aiSettings } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  env.aiEnabled = !!aiSettings?.enabled;

  const { data: automations } = await supabase
    .from("automations")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  const { data: integrations } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  const phoneId = getWhatsAppPhoneId();
  const token = getWhatsAppAccessToken();
  const openRouterKey = getOpenRouterApiKey();

  const results: WebhookMessageResult[] = [];

  for (const msg of incoming) {
    const item: WebhookMessageResult = {
      from: msg.from,
      contactName: msg.contactName,
      content: msg.content,
      replySent: false,
      replySource: "none",
    };

    try {
      const { conversation } = await upsertContactAndConversation(
        supabase,
        businessId,
        msg.from,
        msg.contactName
      );
      item.conversationId = conversation.id;

      await saveMessage(supabase, {
        conversationId: conversation.id,
        direction: "inbound",
        content: msg.content,
        mediaType: msg.mediaType,
        waMessageId: msg.waMessageId,
      });

      await bumpAnalytics(supabase, businessId, "conversations");

      await dispatchIntegrationWebhook(
        integrations?.webhook_url,
        integrations?.events as string[],
        "new_message",
        { conversationId: conversation.id, from: msg.from }
      );

      let replyText: string | null = null;
      let replySource: WebhookMessageResult["replySource"] = "none";

      const keywords = (automations?.keyword_replies ?? []) as Array<{
        keyword: string;
        reply: string;
      }>;
      const matched = keywords.find((k) =>
        msg.content?.toLowerCase().includes(k.keyword.toLowerCase())
      );

      if (matched) {
        replyText = matched.reply;
        replySource = "keyword";
      } else if (automations?.welcome_enabled && automations.welcome_message) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conversation.id);
        if ((count ?? 0) <= 1) {
          replyText = automations.welcome_message;
          replySource = "welcome";
        }
      }

      const handoff = msg.content && shouldHandoffToHuman(msg.content);

      if (handoff) {
        await supabase
          .from("conversations")
          .update({ ai_enabled: false, status: "handoff" })
          .eq("id", conversation.id);

        await supabase.from("notifications").insert({
          business_id: businessId,
          type: "handoff",
          title: "Human assistance requested",
          body: `${msg.contactName} needs a team member.`,
        });

        item.skippedReason = "human_handoff";
      } else if (
        !replyText &&
        aiSettings?.enabled &&
        conversation.ai_enabled &&
        openRouterKey &&
        msg.content
      ) {
        const systemPrompt = buildSystemPrompt(aiSettings);
        const model = resolveAiModel(aiSettings.model);

        const { data: history } = await supabase
          .from("messages")
          .select("direction, content")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true })
          .limit(10);

        const chatHistory =
          history?.map((m) => ({
            role: (m.direction === "inbound" ? "user" : "assistant") as
              | "user"
              | "assistant",
            content: m.content ?? "",
          })) ?? [];

        try {
          replyText = await generateAiReply(
            openRouterKey,
            model,
            systemPrompt,
            msg.content,
            chatHistory
          );
          replySource = "ai";
        } catch (e) {
          replyText =
            "Thanks for reaching out! A team member will follow up shortly.";
          replySource = "fallback";
          item.error = e instanceof Error ? e.message : "AI error";
        }
      } else if (!replyText) {
        const reasons: string[] = [];
        if (!aiSettings?.enabled) reasons.push("AI disabled");
        if (!conversation.ai_enabled) reasons.push("conversation AI off");
        if (!openRouterKey) reasons.push("missing OPENROUTER_API_KEY");
        if (!msg.content) reasons.push("no text content");
        item.skippedReason = reasons.join(", ") || "no_reply_rule_matched";
      }

      if (replyText && phoneId && token) {
        try {
          await sendWhatsAppText({
            phoneId,
            token,
            to: msg.from,
            text: replyText,
          });

          await saveMessage(supabase, {
            conversationId: conversation.id,
            direction: "outbound",
            content: replyText,
            isAi: replySource === "ai",
          });

          await bumpAnalytics(
            supabase,
            businessId,
            replySource === "ai" ? "ai_replies" : "human_replies"
          );

          item.replySent = true;
          item.replyPreview = replyText.slice(0, 200);
          item.replySource = replySource;
        } catch (e) {
          item.error = e instanceof Error ? e.message : "WhatsApp send failed";
        }
      } else if (replyText && (!phoneId || !token)) {
        item.skippedReason = "missing WHATSAPP_PHONE_ID or WHATSAPP_TOKEN";
        item.replyPreview = replyText.slice(0, 200);
      }
    } catch (e) {
      item.error = e instanceof Error ? e.message : "Processing failed";
    }

    results.push(item);
  }

  return {
    ok: true,
    messagesParsed: incoming.length,
    results,
    env,
  };
}
