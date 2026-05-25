import { webhookLog, webhookWarn, webhookError, maskPhone } from "@/lib/webhook-debug";
import type {
  ParsedInboundMessage,
  WebhookPayloadSummary,
} from "@/types/whatsapp-webhook";

const GRAPH_API = "https://graph.facebook.com/v21.0";

export interface SendWhatsAppMessageParams {
  phoneId: string;
  token: string;
  to: string;
  text: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  messageId?: string;
  statusCode: number;
  error?: string;
  responseBody?: unknown;
}

/** Production send helper with full request/response logging. */
export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams
): Promise<WhatsAppSendResult> {
  const to = params.to.replace(/\D/g, "");
  const url = `${GRAPH_API}/${params.phoneId}/messages`;
  const requestBody = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: params.text },
  };

  webhookLog("outgoing_reply_request", {
    phoneId: params.phoneId,
    to: maskPhone(to),
    textLength: params.text.length,
    url,
  });

  if (!params.phoneId?.trim()) {
    return { ok: false, statusCode: 0, error: "WHATSAPP_PHONE_ID is empty" };
  }
  if (!params.token?.trim()) {
    return { ok: false, statusCode: 0, error: "WHATSAPP_TOKEN is empty" };
  }
  if (!to) {
    return { ok: false, statusCode: 0, error: "recipient phone is empty" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    let responseBody: unknown;
    const raw = await res.text();
    try {
      responseBody = raw ? JSON.parse(raw) : {};
    } catch {
      responseBody = { raw };
    }

    if (!res.ok) {
      const error =
        typeof responseBody === "object" &&
        responseBody !== null &&
        "error" in responseBody
          ? JSON.stringify((responseBody as { error: unknown }).error)
          : raw || res.statusText;

      webhookError("outgoing_reply_failed", new Error(error), {
        statusCode: res.status,
        to: maskPhone(to),
      });

      return {
        ok: false,
        statusCode: res.status,
        error: `WhatsApp API ${res.status}: ${error}`,
        responseBody,
      };
    }

    const messageId =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "messages" in responseBody &&
      Array.isArray((responseBody as { messages: Array<{ id?: string }> }).messages)
        ? (responseBody as { messages: Array<{ id?: string }> }).messages[0]?.id
        : undefined;

    webhookLog("outgoing_reply_success", {
      statusCode: res.status,
      messageId,
      to: maskPhone(to),
    });

    return {
      ok: true,
      statusCode: res.status,
      messageId,
      responseBody,
    };
  } catch (e) {
    webhookError("outgoing_reply_network_error", e, { to: maskPhone(to) });
    return {
      ok: false,
      statusCode: 0,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

/** @deprecated Prefer sendWhatsAppMessage — throws on failure for legacy callers. */
export async function sendWhatsAppText(params: SendWhatsAppMessageParams) {
  const result = await sendWhatsAppMessage(params);
  if (!result.ok) {
    throw new Error(result.error ?? "WhatsApp send failed");
  }
  return result.responseBody;
}

export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  verifyToken: string
) {
  if (
    mode === "subscribe" &&
    token?.trim() === verifyToken.trim() &&
    challenge
  ) {
    return challenge;
  }
  return null;
}

function extractTextFromMessage(msg: Record<string, unknown>): {
  content: string | null;
  mediaType: string | null;
  mediaId: string | null;
} {
  const type = typeof msg.type === "string" ? msg.type : "unknown";

  if (type === "text") {
    const text = msg.text as { body?: string } | undefined;
    return {
      content: text?.body?.trim() || null,
      mediaType: null,
      mediaId: null,
    };
  }

  if (type === "image") {
    const image = msg.image as { id?: string } | undefined;
    return { content: "[Image]", mediaType: "image", mediaId: image?.id ?? null };
  }

  if (type === "audio") {
    const audio = msg.audio as { id?: string } | undefined;
    return { content: "[Voice note]", mediaType: "audio", mediaId: audio?.id ?? null };
  }

  if (type === "video") {
    const video = msg.video as { id?: string } | undefined;
    return { content: "[Video]", mediaType: "video", mediaId: video?.id ?? null };
  }

  if (type === "document") {
    const doc = msg.document as { id?: string; filename?: string } | undefined;
    return {
      content: doc?.filename ? `[Document: ${doc.filename}]` : "[Document]",
      mediaType: "document",
      mediaId: doc?.id ?? null,
    };
  }

  if (type === "sticker") {
    const sticker = msg.sticker as { id?: string } | undefined;
    return {
      content: "[Sticker]",
      mediaType: "sticker",
      mediaId: sticker?.id ?? null,
    };
  }

  if (type === "location") {
    const loc = msg.location as { latitude?: number; longitude?: number } | undefined;
    return {
      content:
        loc?.latitude != null && loc?.longitude != null
          ? `[Location: ${loc.latitude}, ${loc.longitude}]`
          : "[Location]",
      mediaType: "location",
      mediaId: null,
    };
  }

  if (type === "button") {
    const button = msg.button as { text?: string } | undefined;
    return { content: button?.text?.trim() || "[Button]", mediaType: null, mediaId: null };
  }

  if (type === "interactive") {
    const interactive = msg.interactive as {
      type?: string;
      button_reply?: { title?: string };
      list_reply?: { title?: string };
    } | undefined;
    const title =
      interactive?.button_reply?.title ||
      interactive?.list_reply?.title ||
      null;
    return {
      content: title?.trim() || "[Interactive reply]",
      mediaType: null,
      mediaId: null,
    };
  }

  return { content: `[${type}]`, mediaType: type, mediaId: null };
}

/**
 * Safely parses Meta webhook JSON into inbound customer messages.
 * Ignores status-only events and malformed entries.
 */
export function parseIncomingWebhook(body: unknown): ParsedInboundMessage[] {
  const messages: ParsedInboundMessage[] = [];

  if (!body || typeof body !== "object") {
    webhookWarn("parse_invalid_body", { type: typeof body });
    return messages;
  }

  const root = body as {
    entry?: Array<{
      id?: string;
      changes?: Array<{
        field?: string;
        value?: Record<string, unknown>;
      }>;
    }>;
  };

  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value || typeof value !== "object") continue;

      const contacts = value.contacts as
        | Array<{ profile?: { name?: string }; wa_id?: string }>
        | undefined;
      const contactName = contacts?.[0]?.profile?.name ?? "Customer";

      const rawMessages = value.messages;
      if (!Array.isArray(rawMessages)) continue;

      for (const raw of rawMessages) {
        if (!raw || typeof raw !== "object") continue;
        const msg = raw as Record<string, unknown>;
        const from = typeof msg.from === "string" ? msg.from.replace(/\D/g, "") : "";
        const waMessageId = typeof msg.id === "string" ? msg.id : "";
        const type = typeof msg.type === "string" ? msg.type : "unknown";

        if (!from) {
          webhookWarn("parse_skip_missing_from", { type, waMessageId });
          continue;
        }

        const { content, mediaType, mediaId } = extractTextFromMessage(msg);

        messages.push({
          from,
          waMessageId,
          type,
          content,
          mediaType,
          mediaId,
          contactName,
          timestamp:
            typeof msg.timestamp === "string" ? msg.timestamp : undefined,
        });
      }
    }
  }

  webhookLog("parse_complete", { count: messages.length });
  return messages;
}

/** Summarizes webhook payload for logs and diagnostics. */
export function summarizeWebhookPayload(body: unknown): WebhookPayloadSummary {
  const fields: string[] = [];
  let messageCount = 0;
  let statusCount = 0;
  let phoneNumberId: string | null = null;
  let displayPhoneNumber: string | null = null;

  if (!body || typeof body !== "object") {
    return {
      fields: "invalid",
      messageCount: 0,
      statusCount: 0,
      phoneNumberId: null,
      displayPhoneNumber: null,
    };
  }

  const root = body as {
    entry?: Array<{ changes?: Array<{ field?: string; value?: Record<string, unknown> }> }>;
  };

  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field) fields.push(change.field);
      const value = change.value;
      if (!value || typeof value !== "object") continue;

      const msgs = value.messages;
      const statuses = value.statuses;
      if (Array.isArray(msgs)) messageCount += msgs.length;
      if (Array.isArray(statuses)) statusCount += statuses.length;

      const meta = value.metadata as
        | { phone_number_id?: string; display_phone_number?: string }
        | undefined;
      if (meta?.phone_number_id) phoneNumberId = String(meta.phone_number_id);
      if (meta?.display_phone_number) {
        displayPhoneNumber = String(meta.display_phone_number);
      }
    }
  }

  return {
    fields: fields.join(", ") || "none",
    messageCount,
    statusCount,
    phoneNumberId,
    displayPhoneNumber,
  };
}

/** Redacted snapshot for logs (no message bodies). */
export function snapshotWebhookPayload(body: unknown): Record<string, unknown> {
  const summary = summarizeWebhookPayload(body);
  return {
    fields: summary.fields,
    messageCount: summary.messageCount,
    statusCount: summary.statusCount,
    phoneNumberId: summary.phoneNumberId,
    displayPhoneNumber: summary.displayPhoneNumber,
  };
}

/** Resolves a temporary download URL for WhatsApp media (images, audio). */
export async function fetchWhatsAppMediaUrl(
  mediaId: string,
  token: string
): Promise<string | null> {
  try {
    const metaRes = await fetch(`${GRAPH_API}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return null;
    const meta = (await metaRes.json()) as { url?: string };
    return meta.url ?? null;
  } catch {
    return null;
  }
}
