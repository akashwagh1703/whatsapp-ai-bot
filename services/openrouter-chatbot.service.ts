/**
 * OpenRouter-powered chatbot (WhatsApp auto-reply + dashboard test chat).
 * API key and default model come from server env only.
 */
import { getDefaultAiModel } from "@/lib/ai-model";
import {
  getOpenRouterApiKey,
  getOpenRouterConfig,
  logOpenRouterEnv,
} from "@/lib/openrouter-env";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatbotRequest {
  systemPrompt: string;
  userMessage: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatbotResponse {
  content: string;
  model: string;
  finishReason?: string;
}

export class OpenRouterChatbotError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public body?: string
  ) {
    super(message);
    this.name = "OpenRouterChatbotError";
  }
}

/** Returns configured API key or throws with a clear setup message. */
export function requireOpenRouterKey(): string {
  const key = getOpenRouterApiKey();
  if (!key) {
    throw new OpenRouterChatbotError(
      "OPENROUTER_API_KEY is not set. Add it to .env.local (restart dev) or Vercel Production (redeploy)."
    );
  }
  return key;
}

/** Resolve model: explicit → env OPENROUTER_DEFAULT_MODEL → built-in free fallback. */
export function resolveChatbotModel(override?: string | null): string {
  return override?.trim() || getDefaultAiModel();
}

/**
 * Send a chat completion to OpenRouter (OpenAI-compatible API).
 */
export async function openRouterChat(
  request: ChatbotRequest
): Promise<ChatbotResponse> {
  const apiKey = request.apiKey ?? requireOpenRouterKey();
  const model = resolveChatbotModel(request.model);

  logOpenRouterEnv("openRouterChat");
  console.info("[openrouter-chatbot] model:", model);

  const messages: ChatMessage[] = [
    { role: "system", content: request.systemPrompt },
    ...(request.history ?? []).slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: request.userMessage },
  ];

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
      "X-Title": "FlowChat AI",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: request.maxTokens ?? 500,
      temperature: request.temperature ?? 0.7,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error("[openrouter-chatbot] API error:", res.status, raw.slice(0, 500));
    throw new OpenRouterChatbotError(
      `OpenRouter API ${res.status}: ${raw.slice(0, 300)}`,
      res.status,
      raw
    );
  }

  let data: {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    model?: string;
  };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new OpenRouterChatbotError("OpenRouter returned invalid JSON", res.status, raw);
  }

  const content =
    data.choices?.[0]?.message?.content?.trim() ||
    "Thanks for your message. We'll get back to you shortly.";

  console.info("[openrouter-chatbot] reply length:", content.length);

  return {
    content,
    model: data.model ?? model,
    finishReason: data.choices?.[0]?.finish_reason,
  };
}

/** Quick connectivity check using env key + free model. */
export async function testOpenRouterChatbot(): Promise<{
  ok: boolean;
  model: string;
  replyPreview?: string;
  error?: string;
}> {
  const cfg = getOpenRouterConfig();
  if (!cfg.keyConfigured) {
    return { ok: false, model: cfg.model, error: "OPENROUTER_API_KEY missing" };
  }

  try {
    const result = await openRouterChat({
      systemPrompt:
        "You are a test assistant. Reply with exactly: Chatbot OK",
      userMessage: "Say Chatbot OK",
      model: cfg.model,
      maxTokens: 32,
      temperature: 0,
    });
    return {
      ok: result.content.toLowerCase().includes("ok"),
      model: result.model,
      replyPreview: result.content.slice(0, 120),
    };
  } catch (e) {
    return {
      ok: false,
      model: cfg.model,
      error: e instanceof Error ? e.message : "Test failed",
    };
  }
}
