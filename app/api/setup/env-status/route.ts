import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  const token = getWhatsAppAccessToken();
  const verifyToken = getWhatsAppVerifyToken();

  return NextResponse.json({
    deploymentNote:
      "Values are read on the server from Vercel Production env at runtime. Development-only env vars do not apply to wa-bot-portal.vercel.app.",
    whatsapp: {
      phoneId: {
        configured: !!phoneId,
        preview: mask(phoneId),
        envKey: "WHATSAPP_PHONE_ID",
      },
      accessToken: {
        configured: !!token,
        preview: token ? "•••• (set)" : "",
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
        configured: !!process.env.OPENROUTER_API_KEY?.trim(),
        envKey: "OPENROUTER_API_KEY",
      },
      defaultModel: process.env.OPENROUTER_DEFAULT_MODEL?.trim() || "(fallback in app)",
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "(not set)",
  });
}
