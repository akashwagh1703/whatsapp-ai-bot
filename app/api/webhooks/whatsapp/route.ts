import { NextResponse } from "next/server";
import { verifyWebhook } from "@/services/whatsapp.service";
import { rateLimit } from "@/lib/rate-limit";
import { getWhatsAppVerifyToken } from "@/lib/whatsapp-env";
import { processWhatsAppWebhook } from "@/services/whatsapp-webhook.handler";

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
  const result = await processWhatsAppWebhook(body);

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

  return NextResponse.json({
    ok: result.ok,
    warning: result.warning,
  });
}
