import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAiSettings, getOrCreateBusiness } from "@/lib/business";
import { resolveAiModel } from "@/lib/ai-model";
import {
  getOpenRouterConfig,
  isOpenRouterEnvConfigured,
  maskOpenRouterKey,
} from "@/lib/openrouter-env";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const business = await getOrCreateBusiness(supabase, user.id);
  const ai = await ensureAiSettings(supabase, business.id as string);
  const cfg = getOpenRouterConfig();

  return NextResponse.json({
    openRouterConfigured: isOpenRouterEnvConfigured(),
    keyMasked: maskOpenRouterKey(cfg.apiKey),
    modelFromEnv: cfg.model,
    modelSource: cfg.modelSource,
    modelInDatabase: ai.model,
    modelResolved: resolveAiModel(ai.model),
    aiEnabled: ai.enabled,
    readyForWhatsApp:
      isOpenRouterEnvConfigured() && ai.enabled,
  });
}
