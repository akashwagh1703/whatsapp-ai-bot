"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { WebhookUrlField } from "@/components/shared/webhook-url-field";
import type { IntegrationStatus } from "@/services/integration-status.service";

export function SetupChecklist() {
  const [copied, setCopied] = useState<string | null>(null);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["integration-status"],
    queryFn: async () => {
      const res = await fetch("/api/setup/status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load status");
      return (await res.json()) as IntegrationStatus;
    },
  });

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Checking integrations…
        </CardContent>
      </Card>
    );
  }

  const done = status?.steps.filter((s) => s.ok).length ?? 0;
  const total = status?.steps.length ?? 5;

  return (
    <div className="space-y-6">
      <Card
        className={
          status?.readyForAutoReply
            ? "border-[color-mix(in_srgb,var(--brand-primary)_35%,white)] bg-brand-soft/60"
            : "border-amber-200 bg-amber-50/30"
        }
      >
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-brand h-5 w-5" />
                Integration setup
              </CardTitle>
              <CardDescription className="mt-1">
                {done}/{total} steps complete
                {status?.readyForAutoReply
                  ? " — Auto AI replies are ready."
                  : " — Finish the steps below to enable automatic replies."}
              </CardDescription>
            </div>
            {status?.readyForAutoReply ? (
              <Badge variant="ai">Ready</Badge>
            ) : (
              <Badge variant="warning">Setup required</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="bg-brand h-full rounded-full transition-all"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Default AI model:{" "}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
              {status?.defaultModel}
            </code>
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {status?.steps.map((step) => (
          <Card key={step.id} className={step.ok ? "border-emerald-100" : ""}>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                {step.ok ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-6 w-6 shrink-0 text-slate-300" />
                )}
                <div>
                  <p className="font-medium text-slate-900">{step.label}</p>
                  <p className="text-sm text-slate-500">{step.description}</p>
                </div>
              </div>
              <Link
                href={step.actionHref}
                className={cn(
                  buttonVariants({
                    variant: step.ok ? "outline" : "default",
                    size: "sm",
                  })
                )}
              >
                {step.actionLabel}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card id="meta-webhook">
        <CardHeader>
          <CardTitle>Meta WhatsApp webhook</CardTitle>
          <CardDescription>
            Paste these in Meta → WhatsApp → Configuration → Webhook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Callback URL</p>
            <WebhookUrlField />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                status?.webhookUrl &&
                copyText("url", status.webhookUrl)
              }
            >
              <Copy className="h-4 w-4" />
              {copied === "url" ? "Copied" : "Copy callback URL"}
            </Button>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Verify token (env only)</p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
              WHATSAPP_VERIFY_TOKEN
              {status?.verifyTokenUsesDefault ? (
                <span className="mt-1 block text-slate-500">
                  Not set in env → default: <strong>flowchat-verify</strong>
                </span>
              ) : (
                <span className="mt-1 block text-emerald-700">
                  Custom token set in Vercel / .env.local — use the same value in Meta.
                </span>
              )}
            </p>
            <p className="mb-2 text-sm font-medium text-slate-700">App secret (signature)</p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <code className="text-xs">WHATSAPP_APP_SECRET</code>
              <span className="mt-1 block text-slate-500">
                Meta → App settings → Basic → App secret. Required on Vercel Production
                so Meta webhook POSTs pass verification.
              </span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Env vars: {status?.whatsappEnvVars.join(", ")}
            </p>
          </div>
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex"
            )}
          >
            <ExternalLink className="h-4 w-4" />
            Open Meta Developer Console
          </a>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Refresh status
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
