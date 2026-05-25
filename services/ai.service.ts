import { HUMAN_HANDOFF_KEYWORDS } from "@/constants";
import {
  getLanguageInstruction,
  type ReplyLanguageCode,
} from "@/constants/industry-presets";
import { openRouterChat } from "@/services/openrouter-chatbot.service";
import type { AiSettings, AiTone } from "@/types";

const TONE_INSTRUCTIONS: Record<AiTone, string> = {
  professional:
    "Respond in a clear, polite, and professional business tone.",
  friendly: "Respond in a warm, friendly, and conversational tone.",
  sales:
    "Respond helpfully while gently guiding toward booking or purchase when appropriate.",
  luxury:
    "Respond with refined, premium language suitable for a luxury brand.",
};

export function buildSystemPrompt(
  settings: Partial<
    Pick<
      AiSettings,
      "prompt" | "tone" | "business_knowledge" | "human_handoff" | "reply_language"
    >
  >
) {
  const tone = settings.tone ?? "professional";
  const langCode = (settings.reply_language ?? "auto") as ReplyLanguageCode;
  const parts = [
    settings.prompt || "You are a helpful business assistant on WhatsApp.",
    TONE_INSTRUCTIONS[tone],
    getLanguageInstruction(langCode),
  ];
  if (settings.business_knowledge) {
    parts.push("Business knowledge:\n" + settings.business_knowledge);
  }
  parts.push(
    "Keep replies concise (under 160 words). Use plain text only. Never mention you are an AI unless asked."
  );
  if (settings.human_handoff) {
    parts.push(
      "If the customer asks for a human or seems very upset, reply briefly that a team member will follow up soon."
    );
  }
  return parts.join("\n\n");
}

export function shouldHandoffToHuman(text: string): boolean {
  const lower = text.toLowerCase();
  if (HUMAN_HANDOFF_KEYWORDS.some((k) => lower.includes(k))) return true;
  const angry = ["angry", "furious", "terrible", "worst", "refund", "complaint"];
  const hits = angry.filter((w) => lower.includes(w)).length;
  return hits >= 2;
}

/** WhatsApp + inbox: generate reply via OpenRouter chatbot. */
export async function generateAiReply(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[] = []
) {
  const result = await openRouterChat({
    apiKey,
    model,
    systemPrompt,
    userMessage,
    history,
  });
  return result.content;
}
