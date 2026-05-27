import { sendWhatsAppMessage } from "@/services/whatsapp.service";

export interface SendReplyParams {
  phoneId: string;
  token: string;
  to: string;
  text: string;
}

export interface SendReplyResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

/** WhatsApp Cloud API — outbound text to user. */
export async function sendReplyToUser(
  params: SendReplyParams
): Promise<SendReplyResult> {
  const result = await sendWhatsAppMessage({
    phoneId: params.phoneId,
    token: params.token,
    to: params.to,
    text: params.text,
  });

  if (!result.ok) {
    return { sent: false, error: result.error };
  }

  return { sent: true, messageId: result.messageId };
}
