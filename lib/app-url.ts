/** Stable app origin for SSR + client (set NEXT_PUBLIC_APP_URL in .env.local). */
export function getAppOrigin() {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return url || "";
}

export function getWebhookUrl() {
  const origin = getAppOrigin();
  return origin
    ? `${origin}/api/webhooks/whatsapp`
    : "/api/webhooks/whatsapp";
}
