import { NextResponse } from "next/server";

/** AI + WhatsApp send can take 15–30s; avoid Vercel timeout before reply is sent. */
export const maxDuration = 60;
import {
  summarizeWebhookPayload,
  verifyWebhook,
} from "@/services/whatsapp.service";
import {
  getWhatsAppAppSecret,
  getWhatsAppVerifyToken,
  isWebhookSignatureEnforced,
} from "@/lib/whatsapp-env";
import { verifyMetaWebhookSignature } from "@/lib/meta-webhook-signature";
import { processWhatsAppWebhook } from "@/services/whatsapp-webhook.handler";
import { createServiceClient } from "@/lib/supabase/server";
import { logWebhookEvent } from "@/lib/webhook-log";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const result = verifyWebhook(
    mode,
    token,
    challenge,
    getWhatsAppVerifyToken()
  );
  if (result) {
    return new NextResponse(result, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const appSecret = getWhatsAppAppSecret();

  if (isWebhookSignatureEnforced()) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
      console.warn("[webhook] Invalid or missing X-Hub-Signature-256");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  } else {
    console.warn(
      "[webhook] WHATSAPP_APP_SECRET not set — skipping signature verification (set on Production)"
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const summary = summarizeWebhookPayload(
    body as Parameters<typeof summarizeWebhookPayload>[0]
  );
  const result = await processWhatsAppWebhook(body);

  try {
    const supabase = await createServiceClient();
    await logWebhookEvent(supabase, {
      fields: summary.fields,
      messagesCount: summary.messageCount,
      phoneNumberId: summary.phoneNumberId,
      result,
    });
  } catch {
    // ignore logging failures
  }

  if (result.warning === "no_messages_in_payload") {
    console.warn(
      "[webhook] POST received but no messages in payload (status-only or unsupported event)"
    );
  }
  if (result.warning === "no_business") {
    console.error(
      "[webhook] No business row in database — sign up at /login on this deployment first"
    );
  }
  if (result.phoneMismatch) {
    console.error(
      "[webhook] WHATSAPP_PHONE_ID in env does not match Meta phone_number_id in payload"
    );
  }

  const first = result.results[0];
  return NextResponse.json({
    ok: result.ok,
    warning: result.warning,
    error: result.error,
    messagesParsed: result.messagesParsed,
    metaFields: summary.fields,
    phoneNumberIdFromMeta: summary.phoneNumberId,
    phoneMismatch: result.phoneMismatch ?? false,
    replySent: first?.replySent ?? false,
    replySaved: first?.replySaved ?? false,
    skippedReason: first?.skippedReason,
    sendError: first?.error,
    env: result.env,
    openRouterModel: result.env.openRouterModel,
    openRouterKeyOk: result.env.hasOpenRouter,
  });
}
