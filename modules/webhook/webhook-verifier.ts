import { verifyMetaWebhookSignature } from "@/lib/meta-webhook-signature";
import { getWhatsAppAppSecret, getWhatsAppVerifyToken } from "@/lib/whatsapp-env";
import { verifyWebhook } from "@/services/whatsapp.service";

export function verifyMetaSubscription(
  mode: string | null,
  token: string | null,
  challenge: string | null
): string | null {
  return verifyWebhook(mode, token, challenge, getWhatsAppVerifyToken());
}

export function verifyInboundWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): { ok: true } | { ok: false; reason: string } {
  const secret = getWhatsAppAppSecret();
  if (!secret.trim()) {
    return { ok: true };
  }
  if (!verifyMetaWebhookSignature(rawBody, signatureHeader, secret)) {
    return { ok: false, reason: "invalid_signature" };
  }
  return { ok: true };
}
