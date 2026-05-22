import type { SupabaseClient } from "@supabase/supabase-js";
import { getWebhookUrl } from "@/lib/app-url";
import { getDefaultAiModel } from "@/lib/ai-model";

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
      .select(
        "whatsapp_phone_id, whatsapp_access_token, whatsapp_verify_token, openrouter_api_key"
      )
      .eq("business_id", businessId)
      .maybeSingle(),
    supabase
      .from("ai_settings")
      .select("enabled, model")
      .eq("business_id", businessId)
      .maybeSingle(),
  ]);

  const phoneId =
    app?.whatsapp_phone_id?.trim() || process.env.WHATSAPP_PHONE_ID?.trim();
  const waToken =
    app?.whatsapp_access_token?.trim() || process.env.WHATSAPP_TOKEN?.trim();
  const openRouterKey =
    app?.openrouter_api_key?.trim() || process.env.OPENROUTER_API_KEY?.trim();
  const verifyToken =
    app?.whatsapp_verify_token?.trim() ||
    process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  const whatsappOk = !!(phoneId && waToken);
  const openRouterOk = !!openRouterKey;
  const aiOk = !!ai?.enabled;
  const webhookOk = !!verifyToken;

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
      label: "WhatsApp (Meta)",
      description: "Phone ID and access token so the app can send messages.",
      ok: whatsappOk,
      actionHref: "/settings",
      actionLabel: "Add WhatsApp credentials",
    },
    {
      id: "openrouter",
      label: "OpenRouter (AI)",
      description: "API key powers automatic AI replies.",
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
      label: "Meta webhook verified",
      description:
        "Callback URL + verify token in Meta Developer Console (messages subscribed).",
      ok: webhookOk,
      actionHref: "/integrations",
      actionLabel: "Copy webhook details",
    },
  ];

  return {
    readyForAutoReply: whatsappOk && openRouterOk && aiOk && webhookOk,
    webhookUrl: getWebhookUrl(),
    verifyTokenConfigured: webhookOk,
    defaultModel: getDefaultAiModel(),
    steps,
  };
}
