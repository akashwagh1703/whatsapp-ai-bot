import { HUMAN_HANDOFF_KEYWORDS } from "@/constants";
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

export function buildSystemPrompt(settings: AiSettings) {
  const parts = [
    settings.prompt || "You are a helpful business assistant on WhatsApp.",
    TONE_INSTRUCTIONS[settings.tone],
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

export async function generateAiReply(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[] = []
) {
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-8),
    { role: "user" as const, content: userMessage },
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "FlowChat AI",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error: ${err}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content as string) || "Thanks for your message. We'll get back to you shortly.";
}
