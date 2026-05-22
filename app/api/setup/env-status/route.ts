import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultAiModel } from "@/lib/ai-model";
import {
  getOpenRouterApiKey,
  isOpenRouterEnvConfigured,
} from "@/lib/openrouter-env";
import {
  getWhatsAppAccessToken,
  getWhatsAppPhoneId,
  getWhatsAppVerifyToken,
  hasCustomVerifyToken,
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

  const phoneId = getWhatsAppPhoneId();
  const waToken = getWhatsAppAccessToken();
  const verifyToken = getWhatsAppVerifyToken();
  const openRouterKey = getOpenRouterApiKey();

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
      ready: isWhatsAppEnvConfigured(),
    },
    openrouter: {
      apiKey: {
        configured: isOpenRouterEnvConfigured(),
        preview: openRouterKey ? "•••• (set)" : "",
        envKey: "OPENROUTER_API_KEY",
      },
      defaultModel: {
        value: getDefaultAiModel(),
        envKey: "OPENROUTER_DEFAULT_MODEL",
      },
      ready: isOpenRouterEnvConfigured(),
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "(not set)",
    readyForAutoReply:
      isWhatsAppEnvConfigured() && isOpenRouterEnvConfigured(),
  });
}
