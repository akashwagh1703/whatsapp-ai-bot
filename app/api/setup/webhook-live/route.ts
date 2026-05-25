import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getWebhookUrl } from "@/lib/app-url";
import { getWhatsAppPhoneId, isWhatsAppEnvConfigured } from "@/lib/whatsapp-env";
import { isOpenRouterEnvConfigured } from "@/lib/openrouter-env";

/** Poll this while testing WhatsApp — shows if Meta reached your server and auto-reply ran. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let recentWebhooks: unknown[] = [];
  let businessCount = 0;
  let serviceRoleOk = false;
  let aiEnabled = false;

  try {
    const service = await createServiceClient();
    serviceRoleOk = true;

    const { count } = await service
      .from("businesses")
      .select("*", { count: "exact", head: true });
    businessCount = count ?? 0;

    const { data: businesses } = await service
      .from("businesses")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1);

    if (businesses?.[0]?.id) {
      const { data: ai } = await service
        .from("ai_settings")
        .select("enabled")
        .eq("business_id", businesses[0].id)
        .maybeSingle();
      aiEnabled = !!ai?.enabled;
    }

    const { data } = await service
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    recentWebhooks = data ?? [];
  } catch (e) {
    return NextResponse.json({
      at: new Date().toISOString(),
      webhookUrl: getWebhookUrl(),
      serviceRoleOk: false,
      serviceRoleError:
        e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY missing?",
      businessCount: 0,
      envPhoneId: getWhatsAppPhoneId() || null,
      whatsappReady: isWhatsAppEnvConfigured(),
      openrouterReady: isOpenRouterEnvConfigured(),
      aiEnabled: false,
      recentWebhooks: [],
      hint: "Add SUPABASE_SERVICE_ROLE_KEY to Vercel Production and redeploy.",
    });
  }

  const last = recentWebhooks[0] as {
    created_at?: string;
    messages_count?: number;
    first_result?: string;
    warning?: string;
    fields?: string;
  } | undefined;

  return NextResponse.json({
    at: new Date().toISOString(),
    webhookUrl: getWebhookUrl(),
    serviceRoleOk,
    businessCount,
    envPhoneId: getWhatsAppPhoneId() || null,
    whatsappReady: isWhatsAppEnvConfigured(),
    openrouterReady: isOpenRouterEnvConfigured(),
    aiEnabled,
    readyForAutoReply:
      serviceRoleOk &&
      businessCount > 0 &&
      isWhatsAppEnvConfigured() &&
      isOpenRouterEnvConfigured() &&
      aiEnabled,
    lastWebhookAt: last?.created_at ?? null,
    lastWebhookMessages: last?.messages_count ?? 0,
    lastWebhookResult: last?.first_result ?? null,
    lastWebhookWarning: last?.warning ?? null,
    recentWebhooks,
    hints: buildHints({
      serviceRoleOk,
      businessCount,
      whatsappReady: isWhatsAppEnvConfigured(),
      openrouterReady: isOpenRouterEnvConfigured(),
      aiEnabled,
      last,
    }),
  });
}

function buildHints(ctx: {
  serviceRoleOk: boolean;
  businessCount: number;
  whatsappReady: boolean;
  openrouterReady: boolean;
  aiEnabled: boolean;
  last?: {
    messages_count?: number;
    first_result?: string;
    warning?: string;
    fields?: string;
  };
}) {
  const hints: string[] = [];
  if (ctx.last?.fields === "signature_rejected") {
    hints.push(
      "ROOT CAUSE: Meta POST was rejected (401). Fix WHATSAPP_APP_SECRET on Vercel Production — must match Meta App Secret exactly, then redeploy. Internal webhook test does NOT use signature."
    );
  }
  if (!ctx.serviceRoleOk) {
    hints.push("Set SUPABASE_SERVICE_ROLE_KEY on Vercel Production.");
  }
  if (ctx.businessCount === 0) {
    hints.push("Sign up on your LIVE site URL so a business row exists.");
  }
  if (!ctx.whatsappReady) {
    hints.push("Set WHATSAPP_PHONE_ID and WHATSAPP_TOKEN on Production.");
  }
  if (!ctx.openrouterReady) {
    hints.push("Set OPENROUTER_API_KEY on Production.");
  }
  if (!ctx.aiEnabled) {
    hints.push("Enable AI in AI Bot settings.");
  }
  if (!process.env.WHATSAPP_APP_SECRET?.trim()) {
    hints.push(
      "Set WHATSAPP_APP_SECRET on Production — Meta webhooks will be rejected once the secret is enforced."
    );
  }
  if (!ctx.last) {
    hints.push(
      "Send a WhatsApp test message — if lastWebhookAt stays empty, Meta is not calling your webhook URL."
    );
  } else if ((ctx.last.messages_count ?? 0) === 0) {
    hints.push("Meta called but sent no message (subscribe to messages field).");
  } else if (ctx.last.first_result?.includes("not_sent")) {
    hints.push("Message received but WhatsApp send failed — check token and test phone.");
  } else if (ctx.last.first_result?.includes("skipped")) {
    hints.push("Message received but auto-reply was skipped — check AI / Human mode.");
  } else if (ctx.last.warning?.includes("phone_number_id")) {
    hints.push(
      "Phone ID mismatch was detected — update WHATSAPP_PHONE_ID in Vercel to match Meta → API Setup → Phone number ID."
    );
  }
  return hints;
}
