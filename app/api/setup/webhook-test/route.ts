import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWebhookUrl } from "@/lib/app-url";
import { verifyWebhook } from "@/services/whatsapp.service";
import { signMetaWebhookBody } from "@/lib/meta-webhook-signature";
import {
  getWhatsAppAppSecret,
  getWhatsAppVerifyToken,
  hasCustomVerifyToken,
  isWebhookSignatureEnforced,
} from "@/lib/whatsapp-env";
import { isOpenRouterEnvConfigured } from "@/lib/openrouter-env";
import {
  getWhatsAppAccessToken,
  getWhatsAppPhoneId,
  isWhatsAppEnvConfigured,
} from "@/lib/whatsapp-env";
import { processWhatsAppWebhook } from "@/services/whatsapp-webhook.handler";
import { createServiceClient } from "@/lib/supabase/server";
import { interpretWebhookTestResult } from "@/lib/interpret-webhook-test";

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
    const rawBody = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (isWebhookSignatureEnforced()) {
      headers["X-Hub-Signature-256"] = signMetaWebhookBody(
        rawBody,
        getWhatsAppAppSecret()
      );
    }
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: rawBody,
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({
      action: "simulate",
      mode: "live_http",
      httpStatus: res.status,
      httpBody: body,
      payload,
      signatureSent: isWebhookSignatureEnforced(),
      hint: isWebhookSignatureEnforced()
        ? "Check Inbox — live endpoint does not return detailed diagnostics"
        : "WHATSAPP_APP_SECRET not set on server — live POST may be rejected once secret is added on Vercel",
    });
  }

  const result = await processWhatsAppWebhook(payload);
  const interpretation = interpretWebhookTestResult(data.text, result);

  return NextResponse.json({
    action: "simulate",
    mode: "internal",
    payload,
    result,
    interpretation,
    hint: interpretation.summary,
  });
}
