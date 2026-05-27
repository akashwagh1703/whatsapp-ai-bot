/**
 * Optional AI provider — used only when flow engine has no match and AI is enabled.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAiModel } from "@/lib/ai-model";
import { getOpenRouterConfig } from "@/lib/openrouter-env";
import {
  buildSystemPrompt,
  generateAiReply,
  shouldHandoffToHuman,
} from "@/services/ai.service";
import type { AiSettings } from "@/types";
import type { ParsedInboundMessage } from "@/types/whatsapp-webhook";
import type { GeneratedResponse } from "@/services/response-generator";
import { defaultFallback, fromAi } from "@/services/response-generator";

const HANDOFF_TEXT =
  "Thanks for your message. A team member will assist you shortly.";

export async function tryAiReply(
  supabase: SupabaseClient,
  params: {
    conversationId: string;
    msg: ParsedInboundMessage;
    aiSettings: AiSettings;
  }
): Promise<GeneratedResponse | null> {
  if (!params.aiSettings.enabled || !params.msg.content?.trim()) {
    return null;
  }

  const openRouterKey = getOpenRouterConfig().apiKey;
  if (!openRouterKey) return null;

  if (shouldHandoffToHuman(params.msg.content)) {
    return {
      text: HANDOFF_TEXT,
      source: "fallback",
      isAi: false,
      handoff: true,
    };
  }

  const { data: history } = await supabase
    .from("messages")
    .select("direction, content")
    .eq("conversation_id", params.conversationId)
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
    last.content === params.msg.content &&
    chatHistory.length > 0
  ) {
    chatHistory = chatHistory.slice(0, -1);
  }

  try {
    const text = await generateAiReply(
      openRouterKey,
      resolveAiModel(params.aiSettings.model),
      buildSystemPrompt(params.aiSettings),
      params.msg.content,
      chatHistory
    );
    return fromAi(text);
  } catch (e) {
    return fromAi(
      defaultFallback().text,
      e instanceof Error ? e.message : "AI error"
    );
  }
}
