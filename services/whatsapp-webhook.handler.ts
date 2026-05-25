import { createServiceClient } from "@/lib/supabase/server";
import { ensureAiSettings } from "@/lib/business";
import { resolveAiModel } from "@/lib/ai-model";
import {
  getOpenRouterApiKey,
  getOpenRouterConfig,
  logOpenRouterEnv,
} from "@/lib/openrouter-env";
import {
  getWhatsAppAccessToken,
  getWhatsAppPhoneId,
} from "@/lib/whatsapp-env";
import { resolveWebhookBusinessId } from "@/lib/resolve-webhook-business";
import { summarizeWebhookPayload } from "@/services/whatsapp.service";
import {
  buildSystemPrompt,
  generateAiReply,
  shouldHandoffToHuman,
} from "@/services/ai.service";
import {
  bumpAnalytics,
  messageExistsByWaId,
  saveMessage,
  upsertContactAndConversation,
} from "@/services/message.service";
import { dispatchIntegrationWebhook } from "@/services/webhook-dispatch.service";
import {
  fetchWhatsAppMediaUrl,
  parseIncomingWebhook,
  sendWhatsAppText,
} from "@/services/whatsapp.service";
import type { SupabaseClient } from "@supabase/supabase-js";

const HANDOFF_REPLY =
  "Thanks for your message. A team member will assist you shortly.";

export interface WebhookMessageResult {
  from: string;
  contactName: string;
  content: string | null;
  conversationId?: string;
  replySent: boolean;
  replySaved: boolean;
  replyPreview?: string;
  replySource?:
    | "keyword"
    | "welcome"
    | "away"
    | "ai"
    | "fallback"
    | "handoff"
    | "duplicate"
    | "none";
  skippedReason?: string;
  error?: string;
}

export interface WebhookProcessResult {
  ok: boolean;
  messagesParsed: number;
  warning?: string;
  error?: string;
  businessId?: string;
  phoneMismatch?: boolean;
  results: WebhookMessageResult[];
  env: {
    hasPhoneId: boolean;
    hasWaToken: boolean;
    hasOpenRouter: boolean;
    openRouterModel: string;
    hasServiceRole: boolean;
    aiEnabled: boolean;
  };
}

async function deliverReply(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    conversationId: string;
    to: string;
    replyText: string;
    replySource: WebhookMessageResult["replySource"];
    phoneId: string;
    token: string;
    isAi: boolean;
  }
): Promise<{ sent: boolean; error?: string }> {
  await saveMessage(supabase, {
    conversationId: params.conversationId,
    direction: "outbound",
    content: params.replyText,
    isAi: params.isAi,
  });

  await bumpAnalytics(
    supabase,
    params.businessId,
    params.isAi ? "ai_replies" : "human_replies"
  );

  if (!params.phoneId || !params.token) {
    return {
      sent: false,
      error: "missing WHATSAPP_PHONE_ID or WHATSAPP_TOKEN in env",
    };
  }

  try {
    await sendWhatsAppText({
      phoneId: params.phoneId,
      token: params.token,
      to: params.to,
      text: params.replyText,
    });
    return { sent: true };
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : "WhatsApp send failed",
    };
  }
}

export async function processWhatsAppWebhook(
  body: unknown
): Promise<WebhookProcessResult> {
  const incoming = parseIncomingWebhook(
    body as Parameters<typeof parseIncomingWebhook>[0]
  );

  const openRouterCfg = getOpenRouterConfig();
  const env = {
    hasPhoneId: !!getWhatsAppPhoneId(),
    hasWaToken: !!getWhatsAppAccessToken(),
    hasOpenRouter: openRouterCfg.keyConfigured,
    openRouterModel: openRouterCfg.model,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    aiEnabled: false,
  };

  if (incoming.length > 0) {
    logOpenRouterEnv("webhook inbound");
  }

  if (!incoming.length) {
    return {
      ok: true,
      messagesParsed: 0,
      warning: "no_messages_in_payload",
      results: [],
      env,
    };
  }

  let supabase;
  try {
    supabase = await createServiceClient();
  } catch (e) {
    return {
      ok: false,
      messagesParsed: incoming.length,
      error:
        e instanceof Error
          ? e.message
          : "Supabase service client failed — check SUPABASE_SERVICE_ROLE_KEY",
      results: [],
      env,
    };
  }

  const metaSummary = summarizeWebhookPayload(
    body as Parameters<typeof summarizeWebhookPayload>[0]
  );

  const resolved = await resolveWebhookBusinessId(
    supabase,
    metaSummary.phoneNumberId
  );

  if (!resolved.businessId) {
    return {
      ok: false,
      messagesParsed: incoming.length,
      warning: "no_business",
      results: [],
      env,
      phoneMismatch: resolved.warning === "phone_id_mismatch",
    };
  }

  const businessId = resolved.businessId;

  let aiSettings;
  try {
    aiSettings = await ensureAiSettings(supabase, businessId);
  } catch (e) {
    return {
      ok: false,
      messagesParsed: incoming.length,
      error: e instanceof Error ? e.message : "Failed to load AI settings",
      results: [],
      env,
    };
  }

  env.aiEnabled = !!aiSettings.enabled;

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

  const envPhoneId = getWhatsAppPhoneId();
  const metaPhoneId = metaSummary.phoneNumberId;
  const token = getWhatsAppAccessToken();
  const openRouterKey = openRouterCfg.apiKey;

  let effectivePhoneId = metaPhoneId || envPhoneId;
  const phoneMismatch =
    !!metaPhoneId && !!envPhoneId && metaPhoneId !== envPhoneId;

  if (phoneMismatch) {
    console.warn(
      "[webhook] WHATSAPP_PHONE_ID env differs from Meta payload — using Meta phone_number_id",
      { meta: metaPhoneId, env: envPhoneId }
    );
    effectivePhoneId = metaPhoneId;
    await supabase.from("app_settings").upsert({
      business_id: businessId,
      whatsapp_phone_id: metaPhoneId,
      updated_at: new Date().toISOString(),
    });
  }

  const results: WebhookMessageResult[] = [];

  for (const msg of incoming) {
    const item: WebhookMessageResult = {
      from: msg.from,
      contactName: msg.contactName,
      content: msg.content,
      replySent: false,
      replySaved: false,
      replySource: "none",
    };

    try {
      if (msg.waMessageId && (await messageExistsByWaId(supabase, msg.waMessageId))) {
        item.skippedReason = "duplicate_wa_message_id";
        item.replySource = "duplicate";
        results.push(item);
        continue;
      }

      const { conversation, isNewConversation, isNewContact } =
        await upsertContactAndConversation(
          supabase,
          businessId,
          msg.from,
          msg.contactName
        );
      item.conversationId = conversation.id;

      let mediaUrl: string | null = null;
      if (msg.mediaId && token) {
        mediaUrl = await fetchWhatsAppMediaUrl(msg.mediaId, token);
      }

      await saveMessage(supabase, {
        conversationId: conversation.id,
        direction: "inbound",
        content: msg.content,
        mediaType: msg.mediaType,
        mediaUrl,
        waMessageId: msg.waMessageId,
      });

      if (isNewConversation) {
        await bumpAnalytics(supabase, businessId, "conversations");
      }
      if (isNewContact) {
        await bumpAnalytics(supabase, businessId, "leads");
        await dispatchIntegrationWebhook(
          integrations?.webhook_url,
          integrations?.events as string[],
          "new_lead",
          {
            conversationId: conversation.id,
            from: msg.from,
            contactName: msg.contactName,
          }
        );
      }

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
      } else if (
        automations?.away_enabled &&
        automations.away_message?.trim()
      ) {
        replyText = automations.away_message.trim();
        replySource = "away";
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

        await dispatchIntegrationWebhook(
          integrations?.webhook_url,
          integrations?.events as string[],
          "ai_handoff",
          {
            conversationId: conversation.id,
            from: msg.from,
            contactName: msg.contactName,
          }
        );

        if (!replyText) {
          replyText = HANDOFF_REPLY;
          replySource = "handoff";
        }
      } else if (
        !replyText &&
        aiSettings.enabled &&
        conversation.ai_enabled &&
        openRouterKey &&
        msg.content?.trim()
      ) {
        const systemPrompt = buildSystemPrompt(aiSettings);
        const model = resolveAiModel(aiSettings.model);
        console.info("[webhook] AI reply using model:", model);

        const { data: history } = await supabase
          .from("messages")
          .select("direction, content")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true })
          .limit(10);

        let chatHistory =
          history?.map((m) => ({
            role: (m.direction === "inbound" ? "user" : "assistant") as
              | "user"
              | "assistant",
            content: m.content ?? "",
          })) ?? [];

        const last = chatHistory[chatHistory.length - 1];
        if (
          last?.role === "user" &&
          last.content === msg.content &&
          chatHistory.length > 0
        ) {
          chatHistory = chatHistory.slice(0, -1);
        }

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
          console.error("[webhook] AI error:", e);
          replyText =
            "Thanks for reaching out! A team member will follow up shortly.";
          replySource = "fallback";
          item.error = e instanceof Error ? e.message : "AI error";
        }
      } else if (!replyText) {
        const reasons: string[] = [];
        if (!aiSettings.enabled) reasons.push("AI disabled in AI Bot settings");
        if (!conversation.ai_enabled)
          reasons.push("conversation in Human mode (re-enable in Inbox)");
        if (!openRouterKey) reasons.push("missing OPENROUTER_API_KEY in env");
        if (!msg.content?.trim() && !msg.mediaType)
          reasons.push("no text or supported media");
        if (automations?.away_enabled && !automations.away_message?.trim())
          reasons.push("away enabled but empty message");
        item.skippedReason = reasons.join(", ") || "no_reply_rule_matched";
      }

      if (replyText) {
        const delivery = await deliverReply(supabase, {
          businessId,
          conversationId: conversation.id,
          to: msg.from,
          replyText,
          replySource,
          phoneId: effectivePhoneId,
          token,
          isAi: replySource === "ai" || replySource === "fallback",
        });
        item.replySaved = true;
        item.replyPreview = replyText.slice(0, 200);
        item.replySource = replySource;
        item.replySent = delivery.sent;
        if (delivery.error) {
          item.error = delivery.error;
          console.error("[webhook] WhatsApp send failed:", delivery.error);
        }
      }
    } catch (e) {
      item.error = e instanceof Error ? e.message : "Processing failed";
      console.error("[webhook] Message processing error:", e);
    }

    results.push(item);
  }

  return {
    ok: true,
    messagesParsed: incoming.length,
    businessId,
    phoneMismatch,
    results,
    env,
  };
}
