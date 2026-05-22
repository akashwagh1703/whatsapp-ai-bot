"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvStatusResponse {
  deploymentNote: string;
  whatsapp: {
    phoneId: { configured: boolean; preview: string; envKey: string };
    accessToken: { configured: boolean; preview: string; envKey: string };
    verifyToken: {
      configured: boolean;
      preview: string;
      envKey: string;
      usesDefault: boolean;
    };
    ready: boolean;
  };
  openrouter: {
    apiKey: { configured: boolean; envKey: string };
    defaultModel: string;
  };
  appUrl: string;
}

function StatusRow({
  label,
  envKey,
  configured,
  preview,
}: {
  label: string;
  envKey: string;
  configured: boolean;
  preview?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3">
      {configured ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{label}</p>
        <p className="font-mono text-xs text-slate-500">{envKey}</p>
        {configured && preview ? (
          <p className="mt-1 text-sm text-emerald-700">Loaded: {preview}</p>
        ) : (
          <p className="mt-1 text-sm text-amber-700">Not loaded on server</p>
        )}
      </div>
    </div>
  );
}

export function WhatsAppEnvStatus() {
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
        Checking server environment…
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-red-600">Could not read env status. Sign in and try again.</p>
    );
  }

  const w = data.whatsapp;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex gap-3 rounded-lg border p-4 text-sm",
          w.ready
            ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
            : "border-amber-200 bg-amber-50/60 text-amber-900"
        )}
      >
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">
            {w.ready
              ? "WhatsApp env is active on this deployment"
              : "WhatsApp env missing on this deployment"}
          </p>
          <p className="mt-1 opacity-90">{data.deploymentNote}</p>
        </div>
      </div>

      <StatusRow
        label="Phone ID"
        envKey={w.phoneId.envKey}
        configured={w.phoneId.configured}
        preview={w.phoneId.preview}
      />
      <StatusRow
        label="Access token"
        envKey={w.accessToken.envKey}
        configured={w.accessToken.configured}
        preview={w.accessToken.preview}
      />
      <StatusRow
        label="Verify token"
        envKey={w.verifyToken.envKey}
        configured={w.verifyToken.configured}
        preview={w.verifyToken.preview}
      />

      <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        <p>
          <span className="font-medium text-slate-800">App URL:</span>{" "}
          {data.appUrl}
        </p>
        <p className="mt-1">
          <span className="font-medium text-slate-800">OpenRouter key:</span>{" "}
          {data.openrouter.apiKey.configured ? "Loaded" : "Missing"} · Model:{" "}
          {data.openrouter.defaultModel}
        </p>
      </div>

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
