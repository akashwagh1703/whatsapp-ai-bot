import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWebhookUrl } from "@/lib/app-url";
import { verifyWebhook } from "@/services/whatsapp.service";
import { getWhatsAppVerifyToken, hasCustomVerifyToken } from "@/lib/whatsapp-env";
import { isOpenRouterEnvConfigured } from "@/lib/openrouter-env";
import {
  getWhatsAppAccessToken,
  getWhatsAppPhoneId,
  isWhatsAppEnvConfigured,
} from "@/lib/whatsapp-env";
import { processWhatsAppWebhook } from "@/services/whatsapp-webhook.handler";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("verify"),
    verifyToken: z.string().min(1),
    challenge: z.string().default("test_challenge_123"),
  }),
  z.object({
    action: z.literal("simulate"),
    from: z.string().min(8).max(20),
    text: z.string().min(1).max(1000),
    contactName: z.string().max(100).optional(),
    sendToLiveEndpoint: z.boolean().optional(),
  }),
]);

function buildMetaPayload(from: string, text: string, contactName: string) {
  const phoneId = getWhatsAppPhoneId() || "0";
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WEBHOOK_TEST",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: phoneId },
              contacts: [{ profile: { name: contactName } }],
              messages: [
                {
                  from: from.replace(/\D/g, ""),
                  id: `wamid.test.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let recentWebhooks: unknown[] = [];
  try {
    const service = await createServiceClient();
    const { data } = await service
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);
    recentWebhooks = data ?? [];
  } catch {
    recentWebhooks = [];
  }

  return NextResponse.json({
    webhookUrl: getWebhookUrl(),
    expectedVerifyToken: getWhatsAppVerifyToken(),
    usesDefaultVerifyToken: !hasCustomVerifyToken(),
    envReady: {
      whatsapp: isWhatsAppEnvConfigured(),
      openrouter: isOpenRouterEnvConfigured(),
      phoneId: !!getWhatsAppPhoneId(),
      waToken: !!getWhatsAppAccessToken(),
    },
    recentWebhooks,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const data = parsed.data;

  if (data.action === "verify") {
    const expected = getWhatsAppVerifyToken();
    const challenge = verifyWebhook(
      "subscribe",
      data.verifyToken,
      data.challenge,
      expected
    );

    return NextResponse.json({
      action: "verify",
      success: !!challenge,
      challengeReturned: challenge ?? null,
      expectedTokenHint: hasCustomVerifyToken()
        ? "custom WHATSAPP_VERIFY_TOKEN"
        : "default flowchat-verify",
      tokenMatches: data.verifyToken.trim() === expected.trim(),
    });
  }

  const payload = buildMetaPayload(
    data.from,
    data.text,
    data.contactName ?? "Webhook Test"
  );

  if (data.sendToLiveEndpoint) {
    const url = getWebhookUrl();
    if (!url.startsWith("http")) {
      return NextResponse.json(
        { error: "Set NEXT_PUBLIC_APP_URL for live endpoint test" },
        { status: 400 }
      );
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({
      action: "simulate",
      mode: "live_http",
      httpStatus: res.status,
      httpBody: body,
      payload,
      hint: "Check Inbox — live endpoint does not return detailed diagnostics",
    });
  }

  const result = await processWhatsAppWebhook(payload);

  return NextResponse.json({
    action: "simulate",
    mode: "internal",
    payload,
    result,
    hint: result.ok
      ? "Check Inbox for the test conversation"
      : "Fix warnings before testing again",
  });
}
