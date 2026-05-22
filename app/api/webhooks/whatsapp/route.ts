import { NextResponse } from "next/server";
import {
  parseIncomingWebhook,
  sendWhatsAppText,
  verifyWebhook,
} from "@/services/whatsapp.service";
import { createServiceClient } from "@/lib/supabase/server";
import {
  upsertContactAndConversation,
  saveMessage,
  bumpAnalytics,
} from "@/services/message.service";
import {
  buildSystemPrompt,
  generateAiReply,
  shouldHandoffToHuman,
} from "@/services/ai.service";
import { dispatchIntegrationWebhook } from "@/services/webhook-dispatch.service";
import { rateLimit } from "@/lib/rate-limit";
import { resolveAiModel } from "@/lib/ai-model";
import {
  getWhatsAppAccessToken,
  getWhatsAppPhoneId,
  getWhatsAppVerifyToken,
} from "@/lib/whatsapp-env";
import { getOpenRouterApiKey } from "@/lib/openrouter-env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const result = verifyWebhook(
    mode,
    token,
    challenge,
    getWhatsAppVerifyToken()
  );
  if (result) {
    return new NextResponse(result, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const limit = rateLimit("webhook:whatsapp");
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const body = await request.json();
  const incoming = parseIncomingWebhook(body);

  if (!incoming.length) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createServiceClient();

  const { data: businesses } = await supabase.from("businesses").select("id");
  if (!businesses?.length) {
    return NextResponse.json({ ok: true });
  }

  const businessId = businesses[0].id as string;

  const { data: aiSettings } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

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

  for (const msg of incoming) {
    const { conversation } = await upsertContactAndConversation(
      supabase,
      businessId,
      msg.from,
      msg.contactName
    );

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

    const keywords = (automations?.keyword_replies ?? []) as Array<{
      keyword: string;
      reply: string;
    }>;
    const matched = keywords.find((k) =>
      msg.content?.toLowerCase().includes(k.keyword.toLowerCase())
    );
    if (matched) {
      replyText = matched.reply;
    } else if (automations?.welcome_enabled && automations.welcome_message) {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversation.id);
      if ((count ?? 0) <= 1) {
        replyText = automations.welcome_message;
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
        { conversationId: conversation.id }
      );
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
      } catch (e) {
        console.error("AI error:", e);
        replyText =
          "Thanks for reaching out! A team member will follow up shortly.";
      }
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
          isAi: !matched && !!aiSettings?.enabled,
        });

        await bumpAnalytics(
          supabase,
          businessId,
          !matched && aiSettings?.enabled ? "ai_replies" : "human_replies"
        );
      } catch (e) {
        console.error("WhatsApp send failed:", e);
      }
    } else if (!replyText) {
      console.warn("[webhook] No reply generated", {
        from: msg.from,
        aiEnabled: aiSettings?.enabled,
        convAiEnabled: conversation.ai_enabled,
        hasOpenRouter: !!openRouterKey,
        hasContent: !!msg.content,
        hasPhoneId: !!phoneId,
        hasWaToken: !!token,
      });
    } else {
      console.warn("[webhook] Reply ready but WhatsApp credentials missing", {
        hasPhoneId: !!phoneId,
        hasWaToken: !!token,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
