import { NextResponse } from "next/server";
import {
  summarizeWebhookPayload,
  verifyWebhook,
} from "@/services/whatsapp.service";
import { rateLimit } from "@/lib/rate-limit";
import { getWhatsAppVerifyToken } from "@/lib/whatsapp-env";
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
  const limit = rateLimit("webhook:whatsapp");
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const body = await request.json();
  const summary = summarizeWebhookPayload(body);
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

  const first = result.results[0];
  return NextResponse.json({
    ok: result.ok,
    warning: result.warning,
    error: result.error,
    messagesParsed: result.messagesParsed,
    metaFields: summary.fields,
    phoneNumberIdFromMeta: summary.phoneNumberId,
    replySent: first?.replySent ?? false,
    replySaved: first?.replySaved ?? false,
    skippedReason: first?.skippedReason,
    sendError: first?.error,
    env: result.env,
  });
}
