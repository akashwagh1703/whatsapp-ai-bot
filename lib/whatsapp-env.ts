/** WhatsApp Cloud API credentials — server env only (not app Settings UI). */

const DEFAULT_VERIFY_TOKEN = "flowchat-verify";

export function getWhatsAppPhoneId(): string {
  return process.env.WHATSAPP_PHONE_ID?.trim() ?? "";
}

export function getWhatsAppAccessToken(): string {
  return process.env.WHATSAPP_TOKEN?.trim() ?? "";
}

export function getWhatsAppVerifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() || DEFAULT_VERIFY_TOKEN;
}

/** Meta App Secret — used to verify X-Hub-Signature-256 on inbound webhooks. */
export function getWhatsAppAppSecret(): string {
  return process.env.WHATSAPP_APP_SECRET?.trim() ?? "";
}

export function isWhatsAppEnvConfigured(): boolean {
  return !!(getWhatsAppPhoneId() && getWhatsAppAccessToken());
}

export function isWebhookSignatureEnforced(): boolean {
  return !!getWhatsAppAppSecret();
}

export function hasCustomVerifyToken(): boolean {
  return !!process.env.WHATSAPP_VERIFY_TOKEN?.trim();
}

/** Optional generic auto-reply when no rule/AI matches (debug + safety net). */
export function getWhatsAppFallbackReply(): string {
  return process.env.WHATSAPP_FALLBACK_REPLY?.trim() ?? "";
}

export interface WhatsAppEnvValidation {
  valid: boolean;
  issues: string[];
  phoneId: string;
  hasToken: boolean;
  hasServiceRole: boolean;
}

/** Validates env required for inbound webhook auto-reply on this server. */
export function validateWhatsAppEnvForWebhook(): WhatsAppEnvValidation {
  const issues: string[] = [];
  const phoneId = getWhatsAppPhoneId();
  const hasToken = !!getWhatsAppAccessToken();
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!phoneId) issues.push("WHATSAPP_PHONE_ID is missing");
  if (!hasToken) issues.push("WHATSAPP_TOKEN is missing");
  if (!hasServiceRole) {
    issues.push("SUPABASE_SERVICE_ROLE_KEY is missing (webhook cannot save or reply)");
  }

  return {
    valid: issues.length === 0,
    issues,
    phoneId,
    hasToken,
    hasServiceRole,
  };
}

/** Sync processing for local debug; default on Vercel is fast 200 + background work. */
export function shouldAwaitWebhookProcessing(): boolean {
  return process.env.WEBHOOK_AWAIT_PROCESSING === "true";
}
