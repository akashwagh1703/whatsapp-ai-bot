const GRAPH_API = "https://graph.facebook.com/v21.0";

export interface SendTextParams {
  phoneId: string;
  token: string;
  to: string;
  text: string;
}

export async function sendWhatsAppText({
  phoneId,
  token,
  to,
  text,
}: SendTextParams) {
  const res = await fetch(`${GRAPH_API}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send failed: ${err}`);
  }

  return res.json();
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

export function parseIncomingWebhook(body: {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          image?: { id: string; mime_type?: string };
          audio?: { id: string; mime_type?: string };
        }>;
        contacts?: Array<{ profile?: { name?: string } }>;
      };
    }>;
  }>;
}) {
  const messages: Array<{
    from: string;
    waMessageId: string;
    type: string;
    content: string | null;
    mediaType: string | null;
    contactName: string;
  }> = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const contactName =
        value?.contacts?.[0]?.profile?.name ?? "Customer";

      for (const msg of value?.messages ?? []) {
        let content: string | null = null;
        let mediaType: string | null = null;

        if (msg.type === "text" && msg.text?.body) {
          content = msg.text.body;
        } else if (msg.type === "image") {
          content = "[Image]";
          mediaType = "image";
        } else if (msg.type === "audio") {
          content = "[Voice note]";
          mediaType = "audio";
        } else {
          content = `[${msg.type}]`;
        }

        messages.push({
          from: msg.from,
          waMessageId: msg.id,
          type: msg.type,
          content,
          mediaType,
          contactName,
        });
      }
    }
  }

  return messages;
}

/** For debugging: what Meta sent when inbox stays empty. */
export function summarizeWebhookPayload(body: {
  entry?: Array<{ changes?: Array<{ field?: string; value?: unknown }> }>;
}) {
  const fields: string[] = [];
  let messageCount = 0;
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field) fields.push(change.field);
      const value = change.value as { messages?: unknown[] } | undefined;
      messageCount += value?.messages?.length ?? 0;
    }
  }
  return { fields: fields.join(", ") || "none", messageCount };
}
