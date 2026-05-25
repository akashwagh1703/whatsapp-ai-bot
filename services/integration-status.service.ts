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

export interface ReliabilityPillar {
  id: string;
  label: string;
  description: string;
  ok: boolean;
  href: string;
}

export interface IntegrationStatus {
  readyForAutoReply: boolean;
  webhookUrl: string;
  verifyTokenConfigured: boolean;
  verifyTokenUsesDefault: boolean;
  whatsappEnvVars: string[];
  openrouterEnvVars: string[];
  defaultModel: string;
  replyLanguage: string;
  steps: SetupStep[];
  reliability: ReliabilityPillar[];
  reliabilityScore: number;
}

export async function getIntegrationStatus(
  supabase: SupabaseClient,
  businessId: string
): Promise<IntegrationStatus> {
  const { data: ai } = await supabase
    .from("ai_settings")
    .select("enabled, model, reply_language")
    .eq("business_id", businessId)
    .maybeSingle();

  const { data: automations } = await supabase
    .from("automations")
    .select("away_enabled, away_message, welcome_enabled, welcome_message")
    .eq("business_id", businessId)
    .maybeSingle();

  const { data: business } = await supabase
    .from("businesses")
    .select("name, logo_url, primary_color")
    .eq("id", businessId)
    .maybeSingle();

  const whatsappOk = isWhatsAppEnvConfigured();
  const openRouterOk = isOpenRouterEnvConfigured();
  const aiOk = !!ai?.enabled;
  const webhookOk = whatsappOk && isWebhookSignatureEnforced();
  const awayOk =
    !!automations?.away_enabled && !!automations.away_message?.trim();
  const brandingOk =
    !!business?.name?.trim() &&
    !!business?.primary_color?.trim();

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

  const reliability: ReliabilityPillar[] = [
    {
      id: "webhook",
      label: "Webhook",
      description: "Meta delivers messages to your server (verify + app secret).",
      ok: webhookOk,
      href: "/integrations#meta-webhook",
    },
    {
      id: "ai",
      label: "AI auto-reply",
      description: "OpenRouter key set and AI assistant turned on.",
      ok: aiOk && openRouterOk,
      href: "/ai-bot",
    },
    {
      id: "inbox",
      label: "Inbox",
      description: "All customer chats saved and visible in one place.",
      ok: true,
      href: "/inbox",
    },
    {
      id: "away",
      label: "Away message",
      description: "Optional — auto-reply when you are closed (Automations).",
      ok: awayOk,
      href: "/automations",
    },
    {
      id: "leads",
      label: "Leads",
      description: "New contacts counted in Analytics when someone texts first time.",
      ok: true,
      href: "/analytics",
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Handoff alerts in the header bell when customers need a human.",
      ok: true,
      href: "/inbox",
    },
    {
      id: "branding",
      label: "Branding",
      description: "Project name and colors on dashboard and login.",
      ok: brandingOk,
      href: "/settings",
    },
  ];

  const reliabilityScore = reliability.filter((p) => p.ok).length;

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
    replyLanguage: ai?.reply_language ?? "auto",
    steps,
    reliability,
    reliabilityScore,
  };
}
