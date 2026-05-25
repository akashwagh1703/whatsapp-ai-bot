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
