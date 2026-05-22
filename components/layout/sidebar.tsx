"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  Settings,
  Users,
  X,
  Zap,
  MessageCircle,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS } from "@/constants";
import { useUiStore } from "@/store/ui-store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const ICONS = {
  LayoutDashboard,
  Inbox,
  Bot,
  Zap,
  Users,
  BarChart3,
  Plug,
  FlaskConical,
  Settings,
} as const;

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon as keyof typeof ICONS];
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={handleLogout}
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </nav>
  );

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col bg-[#0F172A] lg:flex">
        <div className="flex items-center gap-2 px-6 py-6">
          <MessageCircle className="h-7 w-7 text-emerald-400" />
          <span className="text-lg font-semibold text-white">{APP_NAME}</span>
        </div>
        {nav}
      </aside>

      <div className="flex items-center justify-between border-b border-slate-200 bg-[#0F172A] px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2 text-white">
          <MessageCircle className="h-6 w-6 text-emerald-400" />
          <span className="font-semibold">{APP_NAME}</span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-white hover:bg-white/10"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-[#0F172A]">
            <div className="flex items-center justify-between px-6 py-6">
              <div className="flex items-center gap-2 text-white">
                <MessageCircle className="h-7 w-7 text-emerald-400" />
                <span className="text-lg font-semibold">{APP_NAME}</span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
