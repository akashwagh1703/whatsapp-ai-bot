import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_PREFIX = "sha256=";

/** Builds the X-Hub-Signature-256 header Meta expects for a raw JSON body. */
export function signMetaWebhookBody(rawBody: string, appSecret: string): string {
  const digest = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  return `${SIGNATURE_PREFIX}${digest}`;
}

/** Validates Meta webhook POST using App Secret (Settings → Basic in Meta app). */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith(SIGNATURE_PREFIX) || !appSecret.trim()) {
    return false;
  }

  const expected = signMetaWebhookBody(rawBody, appSecret);

  try {
    const received = Buffer.from(signatureHeader, "utf8");
    const computed = Buffer.from(expected, "utf8");
    if (received.length !== computed.length) return false;
    return timingSafeEqual(received, computed);
  } catch {
    return false;
  }
}
