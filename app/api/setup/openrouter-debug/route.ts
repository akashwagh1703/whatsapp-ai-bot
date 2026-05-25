import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateBusiness } from "@/lib/business";
import { resolveAiModel } from "@/lib/ai-model";
import {
  getOpenRouterConfig,
  logOpenRouterEnv,
  maskOpenRouterKey,
} from "@/lib/openrouter-env";
import { testOpenRouterChatbot } from "@/services/openrouter-chatbot.service";

/** Test endpoint: logs OpenRouter env to server console + returns safe JSON. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg = logOpenRouterEnv("GET /api/setup/openrouter-debug");

  const business = await getOrCreateBusiness(supabase, user.id);
  const { data: ai } = await supabase
    .from("ai_settings")
    .select("enabled, model")
    .eq("business_id", business.id)
    .maybeSingle();

  const resolvedModel = resolveAiModel(ai?.model);
  const liveTest = cfg.keyConfigured ? await testOpenRouterChatbot() : null;

  const payload = {
    ok: cfg.keyConfigured,
    message: cfg.keyConfigured
      ? "OPENROUTER_API_KEY found on server — auto-reply can use AI."
      : "OPENROUTER_API_KEY not loaded. Check .env.local and restart npm run dev.",
    env: {
      keyMasked: maskOpenRouterKey(cfg.apiKey),
      keyConfigured: cfg.keyConfigured,
      modelFromEnv: cfg.model,
      modelSource: cfg.modelSource,
      modelResolvedForWebhook: resolvedModel,
    },
    aiSettings: {
      enabled: !!ai?.enabled,
      modelInDatabase: ai?.model ?? null,
    },
    liveTest,
    hints: [
      "Local: put OPENROUTER_API_KEY and OPENROUTER_DEFAULT_MODEL in .env.local",
      "Then stop and run npm run dev again",
      "Production: same vars on Vercel Production + Redeploy",
      "AI Bot toggle must be ON (or we auto-enable when key is first detected)",
      "Turn OFF Away message in Automations if you want AI instead of away text",
    ],
  };

  console.info("[openrouter] debug response:", payload);

  return NextResponse.json(payload);
}
