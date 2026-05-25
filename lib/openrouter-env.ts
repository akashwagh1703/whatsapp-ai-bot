/** OpenRouter credentials — server env only (not database). */

import { getDefaultAiModel } from "@/lib/ai-model";

export function getOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY?.trim() ?? "";
}

export function isOpenRouterEnvConfigured(): boolean {
  return !!getOpenRouterApiKey();
}

export function maskOpenRouterKey(key: string): string {
  if (!key) return "(not set)";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 7)}…${key.slice(-4)} (${key.length} chars)`;
}

export function getOpenRouterConfig() {
  const apiKey = getOpenRouterApiKey();
  const model = getDefaultAiModel();
  return {
    apiKey,
    model,
    keyConfigured: !!apiKey,
    modelSource: process.env.OPENROUTER_DEFAULT_MODEL?.trim()
      ? "OPENROUTER_DEFAULT_MODEL"
      : process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL?.trim()
        ? "NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL"
        : "FALLBACK",
  };
}

/** Server console diagnostics — never logs full API key. */
export function logOpenRouterEnv(context: string) {
  const cfg = getOpenRouterConfig();
  console.info(`[openrouter] ${context}`, {
    key: maskOpenRouterKey(cfg.apiKey),
    keyConfigured: cfg.keyConfigured,
    model: cfg.model,
    modelSource: cfg.modelSource,
  });
  if (!cfg.keyConfigured) {
    console.warn(
      `[openrouter] ${context} — OPENROUTER_API_KEY missing. Add to .env.local and restart npm run dev (or Vercel Production + redeploy).`
    );
  }
  return cfg;
}
