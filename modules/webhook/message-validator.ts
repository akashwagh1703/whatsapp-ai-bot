import { summarizeWebhookPayload } from "@/services/whatsapp.service";

export interface ValidatedWebhookPayload {
  body: unknown;
  summary: ReturnType<typeof summarizeWebhookPayload>;
}

export function parseJsonBody(rawBody: string): unknown {
  return JSON.parse(rawBody);
}

export function validateWebhookPayload(body: unknown): ValidatedWebhookPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload: expected JSON object");
  }
  const summary = summarizeWebhookPayload(body);
  return { body, summary };
}
