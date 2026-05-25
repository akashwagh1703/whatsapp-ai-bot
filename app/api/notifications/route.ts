import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateBusiness } from "@/lib/business";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const business = await getOrCreateBusiness(supabase, user.id);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unreadCount = (data ?? []).filter((n) => !n.read).length;

  return NextResponse.json({
    notifications: data ?? [],
    unreadCount,
  });
}

const patchSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  markAllRead: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const business = await getOrCreateBusiness(supabase, user.id);

  if (parsed.data.markAllRead) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("business_id", business.id)
      .eq("read", false);
  } else if (parsed.data.ids?.length) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("business_id", business.id)
      .in("id", parsed.data.ids);
  }

  return NextResponse.json({ ok: true });
}
