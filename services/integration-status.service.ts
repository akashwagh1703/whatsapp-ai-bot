import type { SupabaseClient } from "@supabase/supabase-js";
import { getWebhookUrl } from "@/lib/app-url";
import { getDefaultAiModel } from "@/lib/ai-model";
import { isOpenRouterEnvConfigured } from "@/lib/openrouter-env";
import {
  getWhatsAppVerifyToken,
  hasCustomVerifyToken,
  isWebhookSignatureEnforced,
  isWhatsAppEnvConfigured,
} from "@/lib/whatsapp-env";

export type SetupStepId =
  | "account"
  | "whatsapp"
  | "openrouter"
  | "ai_bot"
  | "meta_webhook";

export interface SetupStep {
  id: SetupStepId;
  label: string;
  description: string;
  ok: boolean;
  actionHref: string;
  actionLabel: string;
}

export interface IntegrationStatus {
  readyForAutoReply: boolean;
  webhookUrl: string;
  verifyTokenConfigured: boolean;
  verifyTokenUsesDefault: boolean;
  whatsappEnvVars: string[];
  openrouterEnvVars: string[];
  defaultModel: string;
  steps: SetupStep[];
}

export async function getIntegrationStatus(
  supabase: SupabaseClient,
  businessId: string
): Promise<IntegrationStatus> {
  const { data: ai } = await supabase
    .from("ai_settings")
    .select("enabled, model")
    .eq("business_id", businessId)
    .maybeSingle();

  const whatsappOk = isWhatsAppEnvConfigured();
  const openRouterOk = isOpenRouterEnvConfigured();
  const aiOk = !!ai?.enabled;

  const steps: SetupStep[] = [
    {
      id: "account",
      label: "Account & database",
      description: "You are signed in and your business workspace is ready.",
      ok: true,
      actionHref: "/settings",
      actionLabel: "Settings",
    },
    {
      id: "whatsapp",
      label: "WhatsApp env vars",
      description:
        "WHATSAPP_PHONE_ID and WHATSAPP_TOKEN in .env.local / Vercel Production.",
      ok: whatsappOk,
      actionHref: "/settings",
      actionLabel: "Check env status",
    },
    {
      id: "openrouter",
      label: "OpenRouter env var",
      description: "OPENROUTER_API_KEY in .env.local / Vercel Production only.",
      ok: openRouterOk,
      actionHref: "/settings",
      actionLabel: "Check env status",
    },
    {
      id: "ai_bot",
      label: "AI assistant enabled",
      description: "Turn on the AI bot and add your business instructions.",
      ok: aiOk,
      actionHref: "/ai-bot",
      actionLabel: "Configure AI Bot",
    },
    {
      id: "meta_webhook",
      label: "Meta webhook",
      description:
        "Callback URL, verify token, messages field, and WHATSAPP_APP_SECRET on Vercel.",
      ok: isWebhookSignatureEnforced(),
      actionHref: "/integrations#meta-webhook",
      actionLabel: "Copy webhook details",
    },
  ];

  return {
    readyForAutoReply: whatsappOk && openRouterOk && aiOk,
    webhookUrl: getWebhookUrl(),
    verifyTokenConfigured: hasCustomVerifyToken() || !!getWhatsAppVerifyToken(),
    verifyTokenUsesDefault: !hasCustomVerifyToken(),
    whatsappEnvVars: [
      "WHATSAPP_PHONE_ID",
      "WHATSAPP_TOKEN",
      "WHATSAPP_VERIFY_TOKEN",
      "WHATSAPP_APP_SECRET",
    ],
    openrouterEnvVars: ["OPENROUTER_API_KEY", "OPENROUTER_DEFAULT_MODEL"],
    defaultModel: getDefaultAiModel(),
    steps,
  };
}
