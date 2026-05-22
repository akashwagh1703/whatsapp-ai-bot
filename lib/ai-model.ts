/** Hardcoded fallback if env is unset. */
export const FALLBACK_AI_MODEL = "minimax/minimax-m2.5:free";

/** Default model from env (OPENROUTER_DEFAULT_MODEL or NEXT_PUBLIC_*). */
export function getDefaultAiModel(): string {
  return (
    process.env.OPENROUTER_DEFAULT_MODEL?.trim() ||
    process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL?.trim() ||
    FALLBACK_AI_MODEL
  );
}

/** AI Bot model from DB wins; otherwise OPENROUTER_DEFAULT_MODEL env. */
export function resolveAiModel(aiSettingsModel?: string | null): string {
  return aiSettingsModel?.trim() || getDefaultAiModel();
}
