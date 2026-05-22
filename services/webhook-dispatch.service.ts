export async function dispatchIntegrationWebhook(
  webhookUrl: string | null | undefined,
  events: string[] | undefined,
  event: string,
  payload: Record<string, unknown>
) {
  if (!webhookUrl || !events?.includes(event)) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() }),
    });
  } catch {
    // Non-blocking
  }
}
