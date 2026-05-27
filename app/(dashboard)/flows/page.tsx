"use client";

import { useEffect, useState } from "react";
import { GitBranch, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FlowRecord } from "@/types/flow";

export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/flows", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setFlows(data.flows ?? []);
      })
      .catch(() => setError("Failed to load flows"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
          <GitBranch className="h-4 w-4" />
          Flow engine
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Conversation flows</h1>
        <p className="mt-1 text-slate-500">
          Database-driven workflows. Triggers like <strong>hi</strong> start a flow instead of
          hardcoded replies. Legacy AI / automations still run when no flow matches.
        </p>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading flows…
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}

      {!loading &&
        flows.map((flow) => (
          <Card key={flow.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg">{flow.name}</CardTitle>
                <CardDescription>
                  <code className="text-xs">{flow.slug}</code> · priority {flow.priority}
                </CardDescription>
              </div>
              <Badge variant={flow.enabled ? "default" : "outline"}>
                {flow.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="font-medium text-slate-700">Triggers: </span>
                {flow.triggers.join(", ") || "—"}
              </p>
              <p>
                <span className="font-medium text-slate-700">Steps: </span>
                {flow.definition.steps.length} (
                {flow.definition.steps.map((s) => s.type).join(" → ")})
              </p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                {JSON.stringify(flow.definition, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}

      {!loading && flows.length === 0 && (
        <p className="text-slate-500">
          No flows yet. Run <code>supabase/flow-engine-migration.sql</code> then reload — defaults
          seed on first message.
        </p>
      )}
    </div>
  );
}
