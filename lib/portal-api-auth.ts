import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getOrCreateBusiness } from "@/lib/business";

export type PortalAuthResult =
  | { ok: true; mode: "session"; userId: string; businessId: string }
  | { ok: true; mode: "api_key"; businessId: string }
  | { ok: false; error: string };

/** Dashboard session or `X-API-Key` / Bearer matching PORTAL_API_KEY. */
export async function authorizePortalRequest(
  request: Request
): Promise<PortalAuthResult> {
  const expectedKey = process.env.PORTAL_API_KEY?.trim();
  const headerKey =
    request.headers.get("x-api-key")?.trim() ||
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();

  if (expectedKey && headerKey === expectedKey) {
    try {
      const service = await createServiceClient();
      const businessId = process.env.PORTAL_BUSINESS_ID?.trim();

      if (businessId) {
        return { ok: true, mode: "api_key", businessId };
      }

      const { data: businesses } = await service
        .from("businesses")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1);

      if (!businesses?.[0]?.id) {
        return {
          ok: false,
          error: "No business row — sign up on the portal first or set PORTAL_BUSINESS_ID",
        };
      }

      return { ok: true, mode: "api_key", businessId: businesses[0].id as string };
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : "Server misconfigured (SUPABASE_SERVICE_ROLE_KEY?)",
      };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Unauthorized — log in or send X-API-Key header (PORTAL_API_KEY)",
    };
  }

  const business = await getOrCreateBusiness(supabase, user.id);
  return {
    ok: true,
    mode: "session",
    userId: user.id,
    businessId: business.id as string,
  };
}
