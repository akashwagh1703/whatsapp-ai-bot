"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvRow {
  configured: boolean;
  preview?: string;
  envKey: string;
  value?: string;
  usesDefault?: boolean;
}

interface EnvStatusResponse {
  source: string;
  hints: string[];
  whatsapp: {
    phoneId: EnvRow;
    accessToken: EnvRow;
    verifyToken: EnvRow;
    appSecret: EnvRow & { note?: string };
    ready: boolean;
    signatureEnforced?: boolean;
  };
  openrouter: {
    apiKey: EnvRow;
    defaultModel: { value: string; envKey: string };
    ready: boolean;
  };
  appUrl: string;
  readyForAutoReply: boolean;
}

function StatusRow({
  label,
  row,
}: {
  label: string;
  row: EnvRow & { value?: string };
}) {
  const display =
    row.preview || row.value || (row.configured ? "set" : "missing");

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3">
      {row.configured ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{label}</p>
        <p className="font-mono text-xs text-slate-500">{row.envKey}</p>
        <p
          className={cn(
            "mt-1 text-sm",
            row.configured ? "text-emerald-700" : "text-amber-700"
          )}
        >
          {row.configured ? `Loaded: ${display}` : "Not loaded on server"}
        </p>
      </div>
    </div>
  );
}

export function EnvCredentialsStatus() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["env-status"],
    queryFn: async () => {
      const res = await fetch("/api/setup/env-status", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load env status");
      return (await res.json()) as EnvStatusResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading server environment…
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-red-600">
        Could not read env status. Sign in and try again.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "rounded-lg border p-4 text-sm",
          data.readyForAutoReply
            ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
            : "border-amber-200 bg-amber-50/60 text-amber-900"
        )}
      >
        <p className="font-semibold">
          {data.readyForAutoReply
            ? "All required env vars loaded on this server"
            : "Missing env vars on this server"}
        </p>
        <p className="mt-1 opacity-90">{data.source}</p>
        <ul className="mt-2 list-inside list-disc opacity-90">
          {data.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">WhatsApp</h3>
        <div className="space-y-2">
          <StatusRow label="Phone ID" row={data.whatsapp.phoneId} />
          <StatusRow label="Access token" row={data.whatsapp.accessToken} />
          <StatusRow label="Verify token" row={data.whatsapp.verifyToken} />
          <StatusRow label="App secret (webhook signature)" row={data.whatsapp.appSecret} />
        </div>
        {data.whatsapp.signatureEnforced === false && (
          <p className="mt-2 text-xs text-amber-700">
            WHATSAPP_APP_SECRET not set — inbound webhooks are not signature-checked.
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">OpenRouter</h3>
        <div className="space-y-2">
          <StatusRow label="API key" row={data.openrouter.apiKey} />
          <StatusRow
            label="Default model"
            row={{
              configured: !!data.openrouter.defaultModel.value,
              envKey: data.openrouter.defaultModel.envKey,
              preview: data.openrouter.defaultModel.value,
            }}
          />
        </div>
      </div>

      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">NEXT_PUBLIC_APP_URL:</span>{" "}
        {data.appUrl}
      </p>

      <button
        type="button"
        onClick={() => refetch()}
        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
      >
        Refresh status
      </button>
    </div>
  );
}
