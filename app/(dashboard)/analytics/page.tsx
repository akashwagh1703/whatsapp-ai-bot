"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChartCard } from "@/components/analytics/chart-card";
import { StatCard } from "@/components/analytics/stat-card";
import { BarChart3, Clock, TrendingUp, Users } from "lucide-react";

const PIE_COLORS = ["#059669", "#0f172a"];

export default function AnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/dashboard");
      return res.json();
    },
  });

  const { data: series } = useQuery({
    queryKey: ["analytics-series"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/series");
      return res.json();
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
          weekday: "short",
        }),
        conversations: d.conversations,
        leads: d.leads,
      })
    ) ?? [];

  const totalAi = stats?.aiReplies ?? 0;
  const totalHuman = stats?.humanReplies ?? 0;
  const pieData = [
    { name: "AI", value: totalAi },
    { name: "Human", value: totalHuman },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-slate-500">
          A clear picture of how your assistant is performing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Daily conversations"
          value={stats?.totalConversations ?? 0}
          icon={BarChart3}
        />
        <StatCard
          title="AI response share"
          value={
            totalAi + totalHuman > 0
              ? `${Math.round((totalAi / (totalAi + totalHuman)) * 100)}%`
              : "0%"
          }
          icon={TrendingUp}
        />
        <StatCard
          title="Leads generated"
          value={stats?.leadsGenerated ?? 0}
          icon={Users}
        />
        <StatCard
          title="Peak activity"
          value="Weekdays"
          subtitle="Based on recent patterns"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Daily conversations" description="Last 14 days">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="conversations" fill="#059669" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="AI vs human replies" description="Response mix">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Customer growth" description="New leads over time">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="leads" fill="#0f172a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
