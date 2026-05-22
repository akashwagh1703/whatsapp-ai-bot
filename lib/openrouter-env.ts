/** OpenRouter credentials — server env only (not database). */

export function getOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY?.trim() ?? "";
}

export function isOpenRouterEnvConfigured(): boolean {
  return !!getOpenRouterApiKey();
}
