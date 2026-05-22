import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebhookProcessResult } from "@/services/whatsapp-webhook.handler";

export async function logWebhookEvent(
  supabase: SupabaseClient,
  params: {
    fields: string;
    messagesCount: number;
    phoneNumberId?: string | null;
    result: WebhookProcessResult;
  }
) {
  const first = params.result.results[0];
  const firstResult = first
    ? [
        first.replySent ? "sent" : "not_sent",
        first.replySource,
        first.skippedReason,
        first.error,
      ]
        .filter(Boolean)
        .join(" | ")
    : null;

  try {
    const note = [
      params.phoneNumberId ? `phone_id:${params.phoneNumberId}` : null,
      firstResult,
    ]
      .filter(Boolean)
      .join(" | ");

    await supabase.from("webhook_events").insert({
      fields: params.fields,
      messages_count: params.messagesCount,
      warning: params.result.warning ?? params.result.error ?? null,
      first_result: note || firstResult,
    });
  } catch {
    // Table may not exist until schema is applied
  }
}
