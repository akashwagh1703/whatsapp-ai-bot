import type { SupabaseClient } from "@supabase/supabase-js";
import { getWhatsAppPhoneId } from "@/lib/whatsapp-env";

export interface WebhookBusinessResolution {
  businessId: string | null;
  warning?: "no_business" | "phone_id_mismatch";
  metaPhoneId?: string | null;
  envPhoneId?: string;
}

/** Maps Meta webhook to the correct tenant (single-business apps use env phone id). */
export async function resolveWebhookBusinessId(
  supabase: SupabaseClient,
  metaPhoneNumberId: string | null
): Promise<WebhookBusinessResolution> {
  const envPhoneId = getWhatsAppPhoneId();

  if (metaPhoneNumberId) {
    const { data: byMeta } = await supabase
      .from("app_settings")
      .select("business_id")
      .eq("whatsapp_phone_id", metaPhoneNumberId)
      .maybeSingle();

    if (byMeta?.business_id) {
      return {
        businessId: byMeta.business_id as string,
        metaPhoneId: metaPhoneNumberId,
        envPhoneId,
      };
    }
  }

  if (envPhoneId) {
    const { data: byEnv } = await supabase
      .from("app_settings")
      .select("business_id")
      .eq("whatsapp_phone_id", envPhoneId)
      .maybeSingle();

    if (byEnv?.business_id) {
      return {
        businessId: byEnv.business_id as string,
        metaPhoneId: metaPhoneNumberId,
        envPhoneId,
      };
    }
  }

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id")
    .order("created_at", { ascending: true });

  if (!businesses?.length) {
    return {
      businessId: null,
      warning: "no_business",
      metaPhoneId: metaPhoneNumberId,
      envPhoneId,
    };
  }

  const businessId = businesses[0].id as string;

  if (envPhoneId) {
    await supabase.from("app_settings").upsert({
      business_id: businessId,
      whatsapp_phone_id: envPhoneId,
      updated_at: new Date().toISOString(),
    });
  }

  if (
    metaPhoneNumberId &&
    envPhoneId &&
    metaPhoneNumberId !== envPhoneId
  ) {
    return {
      businessId,
      warning: "phone_id_mismatch",
      metaPhoneId: metaPhoneNumberId,
      envPhoneId,
    };
  }

  return {
    businessId,
    metaPhoneId: metaPhoneNumberId,
    envPhoneId,
  };
}
