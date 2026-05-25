/**
 * Resolves what text to send for an inbound message (AI-ready pipeline).
 * Order: keyword → away → welcome → handoff → AI → env fallback.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAiModel } from "@/lib/ai-model";
import { getOpenRouterConfig } from "@/lib/openrouter-env";
import { getWhatsAppFallbackReply } from "@/lib/whatsapp-env";
import { webhookLog, webhookError } from "@/lib/webhook-debug";
import {
  buildSystemPrompt,
  generateAiReply,
  shouldHandoffToHuman,
} from "@/services/ai.service";
import type { ParsedInboundMessage, ResolvedAutoReply } from "@/types/whatsapp-webhook";
import type { AiSettings, Automations, Conversation } from "@/types";

const HANDOFF_REPLY =
  "Thanks for your message. A team member will assist you shortly.";

export async function resolveAutoReply(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    conversation: Conversation;
    msg: ParsedInboundMessage;
    aiSettings: AiSettings;
    automations: Automations | null;
  }
): Promise<ResolvedAutoReply> {
  const { msg, aiSettings, automations, conversation } = params;
  const openRouterKey = getOpenRouterConfig().apiKey;

  const keywords = (automations?.keyword_replies ?? []) as Array<{
    keyword: string;
    reply: string;
  }>;
  const matched = keywords.find((k) =>
    msg.content?.toLowerCase().includes(k.keyword.toLowerCase())
  );

  if (matched) {
    webhookLog("reply_rule_matched", { source: "keyword", keyword: matched.keyword });
    return { text: matched.reply, source: "keyword", isAi: false };
  }

  if (automations?.away_enabled && automations.away_message?.trim()) {
    webhookLog("reply_rule_matched", { source: "away" });
    return {
      text: automations.away_message.trim(),
      source: "away",
      isAi: false,
    };
  }

  if (automations?.welcome_enabled && automations.welcome_message) {
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversation.id);
    if ((count ?? 0) <= 1) {
      webhookLog("reply_rule_matched", { source: "welcome" });
      return {
        text: automations.welcome_message,
        source: "welcome",
        isAi: false,
      };
    }
  }

  const handoff = msg.content && shouldHandoffToHuman(msg.content);
  if (handoff) {
    webhookLog("reply_rule_matched", { source: "handoff" });
    return { text: HANDOFF_REPLY, source: "handoff", isAi: false };
  }

  if (
    aiSettings.enabled &&
    conversation.ai_enabled &&
    openRouterKey &&
    msg.content?.trim()
  ) {
    const systemPrompt = buildSystemPrompt(aiSettings);
    const model = resolveAiModel(aiSettings.model);
    webhookLog("ai_reply_start", { model });

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
      const text = await generateAiReply(
        openRouterKey,
        model,
        systemPrompt,
        msg.content,
        chatHistory
      );
      webhookLog("ai_reply_success", { model, length: text.length });
      return { text, source: "ai", isAi: true };
    } catch (e) {
      webhookError("ai_reply_failed", e, { model });
      return {
        text: "Thanks for reaching out! A team member will follow up shortly.",
        source: "fallback",
        isAi: true,
        aiError: e instanceof Error ? e.message : "AI error",
      };
    }
  }

  const reasons: string[] = [];
  if (!aiSettings.enabled) reasons.push("AI disabled in AI Bot settings");
  if (!conversation.ai_enabled) {
    reasons.push("conversation in Human mode (re-enable in Inbox)");
  }
  if (!openRouterKey) reasons.push("missing OPENROUTER_API_KEY in env");
  if (!msg.content?.trim() && !msg.mediaType) {
    reasons.push("no text or supported media");
  }
  if (automations?.away_enabled && !automations.away_message?.trim()) {
    reasons.push("away enabled but empty message");
  }

  const envFallback = getWhatsAppFallbackReply();
  if (envFallback) {
    webhookLog("reply_env_fallback", { reason: reasons.join(", ") });
    return {
      text: envFallback,
      source: "env_fallback",
      isAi: false,
      skippedReason: reasons.join(", ") || undefined,
    };
  }

  return {
    text: null,
    source: "none",
    isAi: false,
    skippedReason: reasons.join(", ") || "no_reply_rule_matched",
  };
}
