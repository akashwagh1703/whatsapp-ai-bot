/**
 * OpenRouter-powered chatbot (WhatsApp auto-reply + dashboard test chat).
 * API key and default model come from server env only.
 */
import {
  formatRateLimitHint,
  getDefaultAiModel,
  getModelFallbackChain,
} from "@/lib/ai-model";
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
  /** Set when a fallback model was used after 429 on the primary. */
  usedFallback?: boolean;
  modelsAttempted?: string[];
}

export class OpenRouterChatbotError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public body?: string,
    public modelsAttempted?: string[]
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

function isRetryableOpenRouterError(status: number, body: string): boolean {
  if (status === 429 || status === 503) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("rate-limited") ||
    lower.includes("rate limit") ||
    lower.includes("temporarily")
  );
}

async function openRouterChatOnce(
  request: ChatbotRequest,
  model: string,
  apiKey: string
): Promise<ChatbotResponse> {
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
    console.error(
      `[openrouter-chatbot] ${model} error:`,
      res.status,
      raw.slice(0, 400)
    );
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
    throw new OpenRouterChatbotError(
      "OpenRouter returned invalid JSON",
      res.status,
      raw
    );
  }

  const content =
    data.choices?.[0]?.message?.content?.trim() ||
    "Thanks for your message. We'll get back to you shortly.";

  return {
    content,
    model: data.model ?? model,
    finishReason: data.choices?.[0]?.finish_reason,
  };
}

/**
 * Send a chat completion to OpenRouter.
 * On 429 / rate-limit, automatically tries other free models in the fallback chain.
 */
export async function openRouterChat(
  request: ChatbotRequest
): Promise<ChatbotResponse> {
  const apiKey = request.apiKey ?? requireOpenRouterKey();
  const primary = resolveChatbotModel(request.model);
  const models = getModelFallbackChain(primary);

  logOpenRouterEnv("openRouterChat");
  console.info("[openrouter-chatbot] models to try:", models.join(" → "));

  let lastError: OpenRouterChatbotError | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const result = await openRouterChatOnce(request, model, apiKey);
      console.info("[openrouter-chatbot] success:", model, "chars:", result.content.length);
      return {
        ...result,
        usedFallback: i > 0,
        modelsAttempted: models.slice(0, i + 1),
      };
    } catch (e) {
      if (!(e instanceof OpenRouterChatbotError)) throw e;
      lastError = e;
      const retryable = isRetryableOpenRouterError(
        e.statusCode ?? 0,
        e.body ?? e.message
      );
      if (retryable && i < models.length - 1) {
        console.warn(
          `[openrouter-chatbot] ${model} rate-limited — trying ${models[i + 1]}`
        );
        continue;
      }
      break;
    }
  }

  const attempted = models;
  throw new OpenRouterChatbotError(
    lastError?.statusCode === 429
      ? formatRateLimitHint(attempted)
      : (lastError?.message ?? "All OpenRouter models failed"),
    lastError?.statusCode,
    lastError?.body,
    attempted
  );
}

/** Quick connectivity check using env key + free model (with fallbacks). */
export async function testOpenRouterChatbot(): Promise<{
  ok: boolean;
  model: string;
  replyPreview?: string;
  error?: string;
  usedFallback?: boolean;
  modelsAttempted?: string[];
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
      usedFallback: result.usedFallback,
      modelsAttempted: result.modelsAttempted,
    };
  } catch (e) {
    return {
      ok: false,
      model: cfg.model,
      error: e instanceof Error ? e.message : "Test failed",
      modelsAttempted:
        e instanceof OpenRouterChatbotError ? e.modelsAttempted : undefined,
    };
  }
}
