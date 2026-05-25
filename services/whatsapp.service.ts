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
    mediaId: string | null;
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

        const mediaId =
          msg.type === "image"
            ? msg.image?.id
            : msg.type === "audio"
              ? msg.audio?.id
              : undefined;

        messages.push({
          from: msg.from,
          waMessageId: msg.id,
          type: msg.type,
          content,
          mediaType,
          mediaId: mediaId ?? null,
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
  let phoneNumberId: string | null = null;
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field) fields.push(change.field);
      const value = change.value as {
        messages?: unknown[];
        metadata?: { phone_number_id?: string };
      };
      messageCount += value?.messages?.length ?? 0;
      if (value?.metadata?.phone_number_id) {
        phoneNumberId = value.metadata.phone_number_id;
      }
    }
  }
  return {
    fields: fields.join(", ") || "none",
    messageCount,
    phoneNumberId,
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
