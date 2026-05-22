"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { RelativeTime } from "@/components/shared/relative-time";
import { formatPhone } from "@/lib/utils";
import { useState } from "react";
import type { Contact } from "@/types";

export default function ContactsPage() {
  const [filter, setFilter] = useState("");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .maybeSingle();
      if (!business) return [];
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("business_id", business.id)
        .order("last_interaction_at", { ascending: false });
      return (data ?? []) as Contact[];
    },
  });

  const filtered =
    contacts?.filter(
      (c) =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.phone.includes(filter)
    ) ?? [];

  function exportCsv() {
    if (!filtered.length) return;
    const headers = ["Name", "Phone", "Lead Source", "Last Interaction"];
    const rows = filtered.map((c) => [
      c.name,
      c.phone,
      c.lead_source ?? "",
      c.last_interaction_at ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts.csv";
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-500">Everyone who has messaged your business.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Input
        placeholder="Search by name or phone…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-md"
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !filtered.length ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Contacts appear automatically when customers message you on WhatsApp."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Source</th>
                <th className="px-6 py-4 font-medium">Last interaction</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-50 transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {c.name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatPhone(c.phone)}
                  </td>
                  <td className="px-6 py-4 capitalize text-slate-600">
                    {c.lead_source ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {c.last_interaction_at ? (
                      <RelativeTime date={c.last_interaction_at} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
