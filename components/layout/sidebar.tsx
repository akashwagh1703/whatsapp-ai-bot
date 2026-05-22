"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Inbox,
  LayoutDashboard,
  LogOut,
  Plug,
  Settings,
  Users,
  X,
  Zap,
  FlaskConical,
  Sparkles,
  MessageCircle,
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

const NAV_GROUPS: { label: string; hrefs: string[] }[] = [
  {
    label: "Workspace",
    hrefs: ["/dashboard", "/inbox", "/ai-bot", "/automations", "/contacts"],
  },
  {
    label: "Insights",
    hrefs: ["/analytics"],
  },
  {
    label: "Connect",
    hrefs: ["/integrations", "/webhook-test"],
  },
  {
    label: "System",
    hrefs: ["/settings"],
  },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active ? "text-white" : "text-slate-400 hover:text-white"
      )}
    >
      {active && (
        <span
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-400/10 to-transparent ring-1 ring-emerald-400/30"
          aria-hidden
        />
      )}
      {active && (
        <span
          className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-emerald-300 to-teal-500 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
          aria-hidden
        />
      )}
      <span
        className={cn(
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
          active
            ? "bg-emerald-500/20 text-emerald-300 shadow-inner"
            : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-emerald-300"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="relative">{label}</span>
    </Link>
  );
}

function SidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className="group flex items-center gap-3 rounded-2xl p-1 transition"
    >
      <div className="relative">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400/40 to-teal-500/30 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-900/40">
          <MessageCircle className="h-6 w-6 text-white" strokeWidth={2.25} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-bold tracking-tight text-white">
          {APP_NAME}
        </p>
        <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-400/90">
          <Sparkles className="h-3 w-3" />
          WhatsApp AI
        </p>
      </div>
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const itemsByHref = Object.fromEntries(
    NAV_ITEMS.map((item) => [item.href, item])
  );

  return (
    <>
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-6 last:mb-2">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {group.label}
          </p>
          <nav className="flex flex-col gap-0.5">
            {group.hrefs.map((href) => {
              const item = itemsByHref[href];
              if (!item) return null;
              const Icon = ICONS[item.icon as keyof typeof ICONS];
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <NavLink
                  key={href}
                  href={href}
                  label={item.label}
                  icon={Icon}
                  active={active}
                  onNavigate={onNavigate}
                />
              );
            })}
          </nav>
        </div>
      ))}
    </>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onNavigate();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="border-t border-white/[0.06] p-4">
      <div className="mb-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 backdrop-blur-sm">
        <p className="text-xs font-semibold text-white">Pro tip</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Publish your Meta app to receive live WhatsApp webhooks.
        </p>
        <Link
          href="/integrations"
          onClick={onNavigate}
          className="mt-2 inline-flex text-[11px] font-semibold text-emerald-400 transition hover:text-emerald-300"
        >
          Open integrations →
        </Link>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
          <LogOut className="h-4 w-4" />
        </span>
        Sign out
      </button>
    </div>
  );
}

function SidebarInner({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-5 py-6">
        <SidebarBrand onNavigate={onNavigate} />
      </div>
      <div className="sidebar-scroll flex-1 overflow-y-auto px-3 py-5">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <SidebarFooter onNavigate={onNavigate} />
    </div>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const close = () => setSidebarOpen(false);
  const noop = () => {};

  return (
    <>
      <aside className="sidebar-shell relative hidden h-screen w-[17.5rem] shrink-0 lg:flex lg:flex-col">
        <div className="sidebar-mesh pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex h-full flex-col">
          <SidebarInner onNavigate={noop} />
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />
          <aside className="sidebar-shell relative flex h-full w-[min(18rem,88vw)] max-w-sm flex-col shadow-2xl">
            <div className="sidebar-mesh pointer-events-none absolute inset-0" aria-hidden />
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative flex h-full flex-col">
              <SidebarInner onNavigate={close} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
