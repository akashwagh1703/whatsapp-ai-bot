import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateBusiness } from "@/lib/business";
import { getDefaultAiModel } from "@/lib/ai-model";
import { isOpenRouterEnvConfigured } from "@/lib/openrouter-env";

/** Apply env free model + enable AI for WhatsApp auto-reply. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOpenRouterEnvConfigured()) {
    return NextResponse.json(
      {
        error: "OPENROUTER_API_KEY not found on server",
        hint: "Add to .env.local and restart dev, or Vercel Production + redeploy.",
      },
      { status: 503 }
    );
  }

  const business = await getOrCreateBusiness(supabase, user.id);
  const model = getDefaultAiModel();

  const { data, error } = await supabase
    .from("ai_settings")
    .upsert({
      business_id: business.id,
      enabled: true,
      model,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    enabled: true,
    model,
    message: `Chatbot active using ${model}`,
    settings: data,
  });
}
