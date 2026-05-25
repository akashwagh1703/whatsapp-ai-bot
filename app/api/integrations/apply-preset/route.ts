import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateBusiness } from "@/lib/business";
import { getDefaultAiModel } from "@/lib/ai-model";
import { INDUSTRY_PRESETS } from "@/constants/industry-presets";

const schema = z.object({
  presetId: z.string().min(1),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const preset = INDUSTRY_PRESETS.find((p) => p.id === parsed.data.presetId);
  if (!preset) {
    return NextResponse.json({ error: "Unknown preset" }, { status: 404 });
  }

  const business = await getOrCreateBusiness(supabase, user.id);

  const { data: existingAi } = await supabase
    .from("ai_settings")
    .select("model")
    .eq("business_id", business.id)
    .maybeSingle();

  const { error: aiError } = await supabase.from("ai_settings").upsert({
    business_id: business.id,
    enabled: true,
    prompt: preset.prompt,
    tone: preset.tone,
    model: existingAi?.model?.trim() || getDefaultAiModel(),
    business_knowledge: preset.businessKnowledge,
    reply_language: preset.replyLanguage,
    human_handoff: true,
    updated_at: new Date().toISOString(),
  });

  if (aiError) {
    return NextResponse.json({ error: aiError.message }, { status: 500 });
  }

  const { data: existingAuto } = await supabase
    .from("automations")
    .select("away_enabled, away_message")
    .eq("business_id", business.id)
    .maybeSingle();

  const { error: autoError } = await supabase.from("automations").upsert({
    business_id: business.id,
    welcome_enabled: true,
    welcome_message: preset.welcomeMessage,
    keyword_replies: preset.keywordReplies,
    away_enabled: existingAuto?.away_enabled ?? false,
    away_message: existingAuto?.away_message ?? null,
    updated_at: new Date().toISOString(),
  });

  if (autoError) {
    return NextResponse.json({ error: autoError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    preset: { id: preset.id, label: preset.label },
    message: `Applied “${preset.label}” — edit details in AI Bot and Automations, then save.`,
  });
}
