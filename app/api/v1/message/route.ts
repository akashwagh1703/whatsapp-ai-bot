import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizePortalRequest } from "@/lib/portal-api-auth";
import { buildSimulatedMetaPayload } from "@/lib/meta-webhook-payload";
import { rateLimit } from "@/lib/rate-limit";
import { getWebhookUrl } from "@/lib/app-url";
import { processWhatsAppWebhook } from "@/services/whatsapp-webhook.handler";

export const maxDuration = 60;

const postSchema = z.object({
  /** Customer WhatsApp number with country code (digits only). */
  phone: z.string().min(8).max(20),
  /** Message the customer sent. */
  message: z.string().min(1).max(4096),
  contactName: z.string().max(100).optional(),
});

/**
 * Basic messaging API: customer message in → bot reply out (saved to Inbox + WhatsApp).
 *
 * POST /api/v1/message
 * Auth: logged-in session OR header X-API-Key: <PORTAL_API_KEY>
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limit = rateLimit(`api-v1-msg:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = await authorizePortalRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { phone, message, contactName } = parsed.data;
  const payload = buildSimulatedMetaPayload(
    phone,
    message,
    contactName ?? "Customer"
  );

  const result = await processWhatsAppWebhook(payload);
  const first = result.results[0];

  return NextResponse.json({
    ok: result.ok && (first?.replySent ?? false),
    businessId: result.businessId ?? auth.businessId,
    inbound: {
      phone: phone.replace(/\D/g, ""),
      message,
    },
    outbound: {
      reply: first?.replyPreview ?? null,
      source: first?.replySource ?? "none",
      sentToWhatsApp: first?.replySent ?? false,
      whatsAppMessageId: first?.whatsAppMessageId ?? null,
    },
    conversationId: first?.conversationId ?? null,
    skippedReason: first?.skippedReason ?? null,
    error: first?.error ?? result.error ?? null,
    env: {
      aiEnabled: result.env.aiEnabled,
      hasOpenRouter: result.env.hasOpenRouter,
      hasWhatsApp: result.env.hasWaToken && result.env.hasPhoneId,
    },
  });
}

/** API documentation (GET). */
export async function GET() {
  const base = getWebhookUrl().replace(/\/api\/webhooks\/whatsapp$/, "");

  return NextResponse.json({
    name: "FlowChat AI — Basic Message API",
    version: "v1",
    endpoints: {
      sendAndReply: {
        method: "POST",
        path: "/api/v1/message",
        description:
          "Simulates a customer WhatsApp message and runs auto-reply (AI, thanks message, automations).",
      },
      whatsappWebhook: {
        method: "POST",
        path: "/api/webhooks/whatsapp",
        description: "Meta Cloud API webhook (production traffic).",
      },
      testChat: {
        method: "POST",
        path: "/api/ai-bot/chat",
        description: "AI reply only (no WhatsApp send), requires login.",
      },
    },
    authentication: [
      "Cookie session (logged into dashboard)",
      "Header X-API-Key: <PORTAL_API_KEY> (set in server env)",
    ],
    example: {
      curl: `curl -X POST "${base}/api/v1/message" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_PORTAL_API_KEY" \\
  -d '{"phone":"919876543210","message":"Hi, I need help"}'`,
      body: {
        phone: "919876543210",
        message: "Hi, I need help",
        contactName: "Customer",
      },
      response: {
        ok: true,
        inbound: { phone: "919876543210", message: "Hi, I need help" },
        outbound: {
          reply: "Thanks for reaching out! ...",
          source: "ai | fallback | env_fallback | welcome | away",
          sentToWhatsApp: true,
        },
      },
    },
    notes: [
      "Requires WHATSAPP_PHONE_ID + WHATSAPP_TOKEN to deliver on WhatsApp.",
      "AI replies need OPENROUTER_API_KEY and AI Bot ON; if AI OFF, thanks auto-reply is sent.",
      "Same logic as webhook test and real Meta webhooks.",
    ],
  });
}
