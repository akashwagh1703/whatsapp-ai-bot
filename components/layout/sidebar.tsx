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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/constants";
import { BrandLogo } from "@/components/shared/brand-logo";
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
          className="brand-nav-active-bg absolute inset-0 rounded-xl"
          aria-hidden
        />
      )}
      {active && (
        <span
          className="brand-nav-active-bar absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full"
          aria-hidden
        />
      )}
      <span
        className={cn(
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
          active
            ? "brand-nav-icon-active shadow-inner"
            : "brand-nav-icon-hover bg-white/5 text-slate-400 group-hover:bg-white/10"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="relative truncate">{label}</span>
    </Link>
  );
}

function SidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className="group flex min-w-0 flex-1 rounded-2xl p-1 transition"
    >
      <BrandLogo />
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
        <div key={group.label} className="mb-5 last:mb-0">
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
    <div className="shrink-0 border-t border-white/[0.06] p-4">
      <div className="mb-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 backdrop-blur-sm">
        <p className="text-xs font-semibold text-white">Pro tip</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Publish your Meta app to receive live WhatsApp webhooks.
        </p>
        <Link
          href="/integrations"
          onClick={onNavigate}
          className="text-brand mt-2 inline-flex text-[11px] font-semibold transition hover:opacity-80"
        >
          Open integrations →
        </Link>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <LogOut className="h-4 w-4" />
        </span>
        Sign out
      </button>
    </div>
  );
}

function SidebarInner({
  onNavigate,
  showClose,
  onClose,
}: {
  onNavigate: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-4 py-5 lg:px-5 lg:py-6">
        <SidebarBrand onNavigate={onNavigate} />
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
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
      {/* Desktop: fixed to viewport left, full height */}
      <aside
        className={cn(
          "sidebar-shell fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col lg:flex"
        )}
        aria-label="Main navigation"
      >
        <div className="sidebar-mesh pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex h-full min-h-0 flex-col">
          <SidebarInner onNavigate={noop} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          sidebarOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!sidebarOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300",
            sidebarOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={close}
          aria-hidden
        />
        <aside
          className={cn(
            "sidebar-shell absolute inset-y-0 left-0 flex w-[min(var(--sidebar-width),88vw)] max-w-[280px] flex-col shadow-2xl transition-transform duration-300 ease-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
          aria-label="Mobile navigation"
        >
          <div className="sidebar-mesh pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative flex h-full min-h-0 flex-col">
            <SidebarInner
              onNavigate={close}
              showClose
              onClose={close}
            />
          </div>
        </aside>
      </div>
    </>
  );
}
