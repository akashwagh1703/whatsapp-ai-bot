import type { SupabaseClient } from "@supabase/supabase-js";
import { getWebhookUrl } from "@/lib/app-url";
import { getDefaultAiModel } from "@/lib/ai-model";
import {
  getWhatsAppVerifyToken,
  hasCustomVerifyToken,
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
  defaultModel: string;
  steps: SetupStep[];
}

export async function getIntegrationStatus(
  supabase: SupabaseClient,
  businessId: string
): Promise<IntegrationStatus> {
  const [{ data: app }, { data: ai }] = await Promise.all([
    supabase
      .from("app_settings")
      .select("openrouter_api_key")
      .eq("business_id", businessId)
      .maybeSingle(),
    supabase
      .from("ai_settings")
      .select("enabled, model")
      .eq("business_id", businessId)
      .maybeSingle(),
  ]);

  const whatsappOk = isWhatsAppEnvConfigured();
  const openRouterKey =
    app?.openrouter_api_key?.trim() || process.env.OPENROUTER_API_KEY?.trim();
  const openRouterOk = !!openRouterKey;
  const aiOk = !!ai?.enabled;
  const webhookOk = true;

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
        "WHATSAPP_PHONE_ID and WHATSAPP_TOKEN in Vercel / .env.local (not in dashboard).",
      ok: whatsappOk,
      actionHref: "/settings",
      actionLabel: "View env variable names",
    },
    {
      id: "openrouter",
      label: "OpenRouter (AI)",
      description: "OPENROUTER_API_KEY in env or optional key in Settings → AI.",
      ok: openRouterOk,
      actionHref: "/settings",
      actionLabel: "Add OpenRouter key",
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
        "Callback URL + WHATSAPP_VERIFY_TOKEN in Meta (default: flowchat-verify if unset).",
      ok: webhookOk,
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
    ],
    defaultModel: getDefaultAiModel(),
    steps,
  };
}
