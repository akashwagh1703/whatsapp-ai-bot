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

/** AI Bot model from DB if set; otherwise OPENROUTER_DEFAULT_MODEL / NEXT_PUBLIC / fallback. */
export function resolveAiModel(aiSettingsModel?: string | null): string {
  const fromDb = aiSettingsModel?.trim();
  const fromEnv = getDefaultAiModel();
  return fromDb || fromEnv;
}
