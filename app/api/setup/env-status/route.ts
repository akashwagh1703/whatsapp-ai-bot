import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateBusiness } from "@/lib/business";
import {
  getOpenRouterConfig,
  isOpenRouterEnvConfigured,
  logOpenRouterEnv,
} from "@/lib/openrouter-env";
import {
  getWhatsAppAccessToken,
  getWhatsAppAppSecret,
  getWhatsAppPhoneId,
  getWhatsAppVerifyToken,
  hasCustomVerifyToken,
  isWebhookSignatureEnforced,
  isWhatsAppEnvConfigured,
} from "@/lib/whatsapp-env";

function mask(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await getOrCreateBusiness(supabase, user.id);

  const phoneId = getWhatsAppPhoneId();
  const serviceRoleConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const waToken = getWhatsAppAccessToken();
  const verifyToken = getWhatsAppVerifyToken();
  const openRouterCfg = logOpenRouterEnv("GET /api/setup/env-status");

  return NextResponse.json({
    source: "process.env on server (not database)",
    hints: [
      "Local: values from .env.local — restart npm run dev after changes.",
      "Live: values from Vercel Production env — must Redeploy after changes.",
      "Vercel Development environment does NOT apply to wa-bot-portal.vercel.app.",
    ],
    whatsapp: {
      phoneId: {
        configured: !!phoneId,
        preview: mask(phoneId),
        envKey: "WHATSAPP_PHONE_ID",
      },
      accessToken: {
        configured: !!waToken,
        preview: waToken ? "•••• (set)" : "",
        envKey: "WHATSAPP_TOKEN",
      },
      verifyToken: {
        configured: true,
        preview: hasCustomVerifyToken()
          ? mask(verifyToken)
          : "flowchat-verify (default)",
        envKey: "WHATSAPP_VERIFY_TOKEN",
        usesDefault: !hasCustomVerifyToken(),
      },
      appSecret: {
        configured: isWebhookSignatureEnforced(),
        preview: getWhatsAppAppSecret() ? "•••• (set)" : "",
        envKey: "WHATSAPP_APP_SECRET",
        note: "Meta App Secret — required for X-Hub-Signature-256 on inbound webhooks.",
      },
      ready: isWhatsAppEnvConfigured(),
      signatureEnforced: isWebhookSignatureEnforced(),
    },
    openrouter: {
      apiKey: {
        configured: openRouterCfg.keyConfigured,
        preview: openRouterCfg.keyConfigured ? "•••• (set)" : "",
        envKey: "OPENROUTER_API_KEY",
        masked: openRouterCfg.keyConfigured
          ? `••••${openRouterCfg.apiKey.slice(-4)}`
          : "",
      },
      defaultModel: {
        value: openRouterCfg.model,
        envKey: "OPENROUTER_DEFAULT_MODEL",
        source: openRouterCfg.modelSource,
      },
      ready: openRouterCfg.keyConfigured,
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "(not set)",
    serviceRole: {
      configured: serviceRoleConfigured,
      envKey: "SUPABASE_SERVICE_ROLE_KEY",
      note: "Required for inbound WhatsApp webhooks to save messages and reply.",
    },
    readyForAutoReply:
      serviceRoleConfigured &&
      isWhatsAppEnvConfigured() &&
      isOpenRouterEnvConfigured(),
  });
}
