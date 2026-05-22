import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateBusiness } from "@/lib/business";
import { getDashboardStats } from "@/services/analytics.service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const business = await getOrCreateBusiness(supabase, user.id);
  const stats = await getDashboardStats(supabase, business.id);
  return NextResponse.json(stats);
}
