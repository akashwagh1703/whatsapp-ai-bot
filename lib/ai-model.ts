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

/** Admin-selected model wins; otherwise env default. */
export function resolveAiModel(
  aiSettingsModel?: string | null,
  appSettingsModel?: string | null
): string {
  const fromAdmin = aiSettingsModel?.trim() || appSettingsModel?.trim();
  return fromAdmin || getDefaultAiModel();
}
