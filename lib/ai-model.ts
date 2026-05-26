/** Hardcoded fallback if env is unset. */
export const FALLBACK_AI_MODEL = "minimax/minimax-m2.5:free";

/**
 * Free models to try when the primary is rate-limited (429).
 * Order matters — put more reliable options first.
 * @see https://openrouter.ai/models?max_price=0
 */
export const FREE_MODEL_FALLBACK_CHAIN = [
  "minimax/minimax-m2.5:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "qwen/qwen3-4b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
] as const;

/** Default model from env (OPENROUTER_DEFAULT_MODEL or NEXT_PUBLIC_*). */
export function getDefaultAiModel(): string {
  return (
    process.env.OPENROUTER_DEFAULT_MODEL?.trim() ||
    process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL?.trim() ||
    FALLBACK_AI_MODEL
  );
}

/** Models to try in order: primary → env fallbacks → built-in free chain. */
export function getModelFallbackChain(primary: string): string[] {
  const fromEnv =
    process.env.OPENROUTER_FALLBACK_MODELS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const chain = [primary, ...fromEnv, ...FREE_MODEL_FALLBACK_CHAIN];
  return [...new Set(chain.filter(Boolean))];
}

/** AI Bot model from DB if set; otherwise OPENROUTER_DEFAULT_MODEL / NEXT_PUBLIC / fallback. */
export function resolveAiModel(aiSettingsModel?: string | null): string {
  const fromDb = aiSettingsModel?.trim();
  const fromEnv = getDefaultAiModel();
  return fromDb || fromEnv;
}

/** Short hint when OpenRouter free tier is rate-limited. */
export function formatRateLimitHint(triedModels: string[]): string {
  return (
    `Free model rate-limited (tried: ${triedModels.join(" → ")}). ` +
    `Set OPENROUTER_DEFAULT_MODEL=minimax/minimax-m2.5:free in env, wait a minute, or add credits at openrouter.ai.`
  );
}
