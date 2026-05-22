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

export function isWhatsAppEnvConfigured(): boolean {
  return !!(getWhatsAppPhoneId() && getWhatsAppAccessToken());
}

export function hasCustomVerifyToken(): boolean {
  return !!process.env.WHATSAPP_VERIFY_TOKEN?.trim();
}
