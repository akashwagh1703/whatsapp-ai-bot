import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardStats } from "@/types";

export async function getDashboardStats(
  supabase: SupabaseClient,
  businessId: string
): Promise<DashboardStats> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ count: totalConversations }, { data: analytics }, { count: active }] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId),
      supabase
        .from("analytics_daily")
        .select("ai_replies, human_replies, leads, conversations")
        .eq("business_id", businessId)
        .gte("date", thirtyDaysAgo.toISOString().slice(0, 10)),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "open"),
    ]);

  const aiReplies = analytics?.reduce((s, r) => s + (r.ai_replies ?? 0), 0) ?? 0;
  const humanReplies =
    analytics?.reduce((s, r) => s + (r.human_replies ?? 0), 0) ?? 0;
  const leadsGenerated =
    analytics?.reduce((s, r) => s + (r.leads ?? 0), 0) ?? 0;
  const totalReplies = aiReplies + humanReplies;
  const responseRate =
    totalReplies > 0
      ? Math.round((totalReplies / Math.max(totalConversations ?? 1, 1)) * 100)
      : 0;

  return {
    totalConversations: totalConversations ?? 0,
    aiReplies,
    humanReplies,
    leadsGenerated,
    activeConversations: active ?? 0,
    responseRate: Math.min(responseRate, 100),
  };
}

export async function getAnalyticsSeries(
  supabase: SupabaseClient,
  businessId: string,
  days = 14
) {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const { data } = await supabase
    .from("analytics_daily")
    .select("*")
    .eq("business_id", businessId)
    .gte("date", from.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  return data ?? [];
}
