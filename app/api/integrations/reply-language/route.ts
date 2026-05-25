import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateBusiness } from "@/lib/business";
import { REPLY_LANGUAGES } from "@/constants/industry-presets";

const schema = z.object({
  replyLanguage: z.enum(
    REPLY_LANGUAGES.map((l) => l.value) as [string, ...string[]]
  ),
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
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const business = await getOrCreateBusiness(supabase, user.id);

  const { data: existing } = await supabase
    .from("ai_settings")
    .select("business_id")
    .eq("business_id", business.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("ai_settings")
        .update({
          reply_language: parsed.data.replyLanguage,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", business.id)
    : await supabase.from("ai_settings").insert({
        business_id: business.id,
        reply_language: parsed.data.replyLanguage,
        enabled: true,
      });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    replyLanguage: parsed.data.replyLanguage,
  });
}
