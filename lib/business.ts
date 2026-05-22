import type { SupabaseClient } from "@supabase/supabase-js";

export async function getOrCreateBusiness(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: business, error } = await supabase
    .from("businesses")
    .insert({ user_id: userId, name: "My Business" })
    .select()
    .single();

  if (error) throw error;

  await supabase.from("ai_settings").insert({ business_id: business.id });
  await supabase.from("automations").insert({ business_id: business.id });
  await supabase.from("integration_settings").insert({ business_id: business.id });
  await supabase.from("app_settings").insert({ business_id: business.id });

  return business;
}

export async function getBusinessId(supabase: SupabaseClient, userId: string) {
  const business = await getOrCreateBusiness(supabase, userId);
  return business.id as string;
}
