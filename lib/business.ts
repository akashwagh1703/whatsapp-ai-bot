import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiSettings } from "@/types";
import { getWhatsAppPhoneId } from "@/lib/whatsapp-env";

/** Guarantees ai_settings row exists (enabled by default in schema). */
export async function ensureAiSettings(
  supabase: SupabaseClient,
  businessId: string
): Promise<AiSettings> {
  const { data: existing } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing) return existing as AiSettings;

  const { data: created, error } = await supabase
    .from("ai_settings")
    .insert({ business_id: businessId })
    .select()
    .single();

  if (error) throw error;
  return created as AiSettings;
}

export async function getOrCreateBusiness(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await syncWhatsAppPhoneIdToAppSettings(supabase, existing.id as string);
    return existing;
  }

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

  await syncWhatsAppPhoneIdToAppSettings(supabase, business.id as string);

  return business;
}

/** Links Meta phone_number_id to this business for inbound webhooks. */
export async function syncWhatsAppPhoneIdToAppSettings(
  supabase: SupabaseClient,
  businessId: string
) {
  const phoneId = getWhatsAppPhoneId();
  if (!phoneId) return;

  await supabase.from("app_settings").upsert({
    business_id: businessId,
    whatsapp_phone_id: phoneId,
    updated_at: new Date().toISOString(),
  });
}

export async function getBusinessId(supabase: SupabaseClient, userId: string) {
  const business = await getOrCreateBusiness(supabase, userId);
  return business.id as string;
}
