"use client";

import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Bot,
  User,
  Users,
  Activity,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/analytics/stat-card";
import { ChartCard } from "@/components/analytics/chart-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import { RelativeTime } from "@/components/shared/relative-time";
import type { Conversation } from "@/types";
import Link from "next/link";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/dashboard", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
  });

  const { data: series } = useQuery({
    queryKey: ["analytics-series"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/series", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-conversations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .maybeSingle();
      if (!business) return [];

      const { data } = await supabase
        .from("conversations")
        .select("*, contact:contacts(*)")
        .eq("business_id", business.id)
        .order("last_message_at", { ascending: false })
        .limit(5);
      return (data ?? []) as Conversation[];
    },
  });

  const chartData =
    series?.map(
      (d: {
        date: string;
        conversations: number;
        ai_replies: number;
        leads: number;
      }) => ({
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        messages: d.conversations + d.ai_replies,
        leads: d.leads,
        ai: d.ai_replies,
      })
    ) ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-emerald-600">Today&apos;s overview</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
          Your AI assistant is actively helping customers today.
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Everything is running smoothly. Review conversations or fine-tune your
          AI when you&apos;re ready.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              title="Total Conversations"
              value={stats?.totalConversations ?? 0}
              icon={MessageSquare}
              trend="Last 30 days"
            />
            <StatCard
              title="AI Replies"
              value={stats?.aiReplies ?? 0}
              icon={Bot}
              trend="Automated responses"
            />
            <StatCard
              title="Human Replies"
              value={stats?.humanReplies ?? 0}
              icon={User}
            />
            <StatCard
              title="Leads Generated"
              value={stats?.leadsGenerated ?? 0}
              icon={Users}
            />
            <StatCard
              title="Active Conversations"
              value={stats?.activeConversations ?? 0}
              icon={Activity}
            />
            <StatCard
              title="Response Rate"
              value={`${stats?.responseRate ?? 0}%`}
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Messages" description="Daily conversation activity">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="messages"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Leads" description="New leads over time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#0f172a"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="AI Activity" description="AI replies per day">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="ai"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent conversations
          </h2>
          <Link
            href="/inbox"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View inbox
          </Link>
        </div>
        {!recent?.length ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Your AI assistant is ready to help customers. Connect WhatsApp in Settings to get started."
          />
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white">
            {recent.map((conv) => (
              <Link
                key={conv.id}
                href={`/inbox?c=${conv.id}`}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
              >
                <Avatar name={conv.contact?.name ?? "Customer"} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {conv.contact?.name}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {conv.last_message}
                  </p>
                </div>
                {conv.ai_enabled && <Badge variant="ai">AI</Badge>}
                {conv.last_message_at && (
                  <RelativeTime
                    date={conv.last_message_at}
                    className="text-xs text-slate-400"
                  />
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
