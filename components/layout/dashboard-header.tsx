"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronRight,
  Menu,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/constants";
import { useUiStore } from "@/store/ui-store";
import { createClient } from "@/lib/supabase/client";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Overview of conversations and AI performance",
  },
  "/inbox": {
    title: "Inbox",
    subtitle: "Reply to customers in real time",
  },
  "/ai-bot": {
    title: "AI Bot",
    subtitle: "Train your assistant and tone of voice",
  },
  "/automations": {
    title: "Automations",
    subtitle: "Welcome messages, keywords, and routing",
  },
  "/contacts": {
    title: "Contacts",
    subtitle: "Everyone who has messaged your business",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Trends, volume, and team activity",
  },
  "/integrations": {
    title: "Integrations",
    subtitle: "WhatsApp, OpenRouter, and Meta webhooks",
  },
  "/webhook-test": {
    title: "Webhook test",
    subtitle: "Verify Meta callbacks and auto-reply",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Environment credentials and preferences",
  },
};

function resolvePageMeta(pathname: string) {
  const exact = PAGE_META[pathname];
  if (exact) return exact;

  const nav = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  if (nav) {
    return {
      title: nav.label,
      subtitle: "Manage your WhatsApp AI workspace",
    };
  }

  return { title: "Workspace", subtitle: "FlowChat AI" };
}

export function DashboardHeader() {
  const pathname = usePathname();
  const { setSidebarOpen } = useUiStore();
  const meta = resolvePageMeta(pathname);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";

  return (
    <header className="dashboard-header sticky top-0 z-30 border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <nav
              className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-400"
              aria-label="Breadcrumb"
            >
              <Link
                href="/dashboard"
                className="transition hover:text-emerald-600"
              >
                Home
              </Link>
              <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
              <span className="capitalize text-slate-500">{segment}</span>
            </nav>
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {meta.title}
            </h1>
            <p className="mt-0.5 hidden truncate text-sm text-slate-500 sm:block">
              {meta.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden flex-1 sm:flex sm:max-w-xs md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search conversations…"
              className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50/80 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
              aria-label="Search"
            />
          </div>

          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 md:inline-flex">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            AI ready
          </span>

          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </button>

          <div
            className={cn(
              "flex max-w-[180px] items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white py-1.5 pl-1.5 pr-3 shadow-sm",
              "transition hover:border-emerald-200/80 hover:shadow-md"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-inner">
              {email ? email.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="truncate text-xs font-semibold text-slate-800">
                {email?.split("@")[0] ?? "Account"}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {email ?? "Signed in"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
