"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RelativeTime } from "@/components/shared/relative-time";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<{
        notifications: NotificationRow[];
        unreadCount: number;
      }>;
    },
    refetchInterval: open ? 15_000 : 60_000,
  });

  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    const supabase = (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      return createClient();
    })();
    let channel: ReturnType<Awaited<typeof supabase>["channel"]> | null = null;

    void supabase.then((client) => {
      channel = client
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          () => {
            void refetch();
            void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }
        )
        .subscribe();
    });

    return () => {
      void supabase.then((client) => {
        if (channel) client.removeChannel(channel);
      });
    };
  }, [queryClient, refetch]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="bg-brand absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-semibold text-slate-900">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-brand inline-flex items-center gap-1 text-xs font-medium hover:opacity-80"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !data?.notifications.length ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No notifications yet. Handoff requests appear here.
              </p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {data.notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "px-4 py-3",
                      !n.read && "bg-brand-soft/40"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">
                      <RelativeTime date={n.created_at} />
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-slate-100 px-4 py-2">
            <Link
              href="/inbox"
              onClick={() => setOpen(false)}
              className="text-brand text-xs font-medium hover:opacity-80"
            >
              Open inbox →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
