"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  FlaskConical,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebhookUrlField } from "@/components/shared/webhook-url-field";
import { cn } from "@/lib/utils";

interface WebhookMeta {
  webhookUrl: string;
  expectedVerifyToken: string;
  usesDefaultVerifyToken: boolean;
  envReady: {
    whatsapp: boolean;
    openrouter: boolean;
    phoneId: boolean;
    waToken: boolean;
  };
}

export default function WebhookTestPage() {
  const [meta, setMeta] = useState<WebhookMeta | null>(null);
  const [verifyToken, setVerifyToken] = useState("flowchat-verify");
  const [from, setFrom] = useState("919876543210");
  const [text, setText] = useState("Hello, this is a webhook test from the admin portal.");
  const [contactName, setContactName] = useState("Webhook Test");
  const [loading, setLoading] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<object | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/setup/webhook-test", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setMeta(data);
        if (data.expectedVerifyToken) {
          setVerifyToken(data.expectedVerifyToken);
        }
      })
      .catch(() => {});
  }, []);

  async function runTest(
    action: "verify" | "simulate" | "simulate_live",
    body: Record<string, unknown>
  ) {
    setLoading(action);
    setLastResult(null);
    try {
      const res = await fetch("/api/setup/webhook-test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setLastResult(data);
    } catch (e) {
      setLastResult({
        error: e instanceof Error ? e.message : "Request failed",
      });
    }
    setLoading(null);
  }

  function copyUrl() {
    const url = meta?.webhookUrl;
    if (!url?.startsWith("http")) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const envOk = meta?.envReady.whatsapp && meta?.envReady.openrouter;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          <FlaskConical className="h-4 w-4" />
          Admin tools
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Webhook testing</h1>
        <p className="mt-1 text-slate-500">
          Test Meta verification and simulate incoming messages without leaving the
          portal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment snapshot</CardTitle>
          <CardDescription>What this server sees from env vars right now.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {meta ? (
            <>
              <EnvPill ok={meta.envReady.phoneId} label="WHATSAPP_PHONE_ID" />
              <EnvPill ok={meta.envReady.waToken} label="WHATSAPP_TOKEN" />
              <EnvPill ok={meta.envReady.openrouter} label="OPENROUTER_API_KEY" />
              <EnvPill
                ok={meta.envReady.whatsapp && meta.envReady.openrouter}
                label="Ready for full test"
              />
            </>
          ) : (
            <p className="text-sm text-slate-500">Loading…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Verify token (Meta GET)</CardTitle>
          <CardDescription>
            Same check Meta runs when you click Verify and save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Callback URL</Label>
            <div className="mt-2 flex gap-2">
              <WebhookUrlField />
              {meta?.webhookUrl?.startsWith("http") && (
                <Button variant="outline" size="icon" onClick={copyUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            {copied && (
              <p className="mt-1 text-xs text-emerald-600">URL copied</p>
            )}
          </div>
          <div>
            <Label>Verify token to test</Label>
            <Input
              className="mt-2 font-mono text-sm"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
            />
            {meta?.usesDefaultVerifyToken && (
              <p className="mt-1 text-xs text-slate-500">
                Server default: flowchat-verify (set WHATSAPP_VERIFY_TOKEN to override)
              </p>
            )}
          </div>
          <Button
            onClick={() =>
              runTest("verify", {
                action: "verify",
                verifyToken,
                challenge: "admin_test_challenge",
              })
            }
            disabled={loading !== null}
          >
            {loading === "verify" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Test verify
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Simulate incoming message</CardTitle>
          <CardDescription>
            Runs the real webhook handler (saves to Inbox, may send WhatsApp + AI reply).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!envOk && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Set WhatsApp + OpenRouter env vars first — see{" "}
              <Link href="/settings" className="font-medium underline">
                Settings → Environment
              </Link>
              .
            </p>
          )}
          <div>
            <Label>Customer phone (digits, country code)</Label>
            <Input
              className="mt-2 font-mono"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="919876543210"
            />
          </div>
          <div>
            <Label>Contact name</Label>
            <Input
              className="mt-2"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div>
            <Label>Message text</Label>
            <Textarea
              className="mt-2 min-h-[80px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                runTest("simulate", {
                  action: "simulate",
                  from,
                  text,
                  contactName,
                })
              }
              disabled={loading !== null}
            >
              {loading === "simulate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run internal test
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                runTest("simulate_live", {
                  action: "simulate",
                  from,
                  text,
                  contactName,
                  sendToLiveEndpoint: true,
                })
              }
              disabled={loading !== null}
            >
              Hit live webhook URL
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Internal test = full diagnostics. Live URL = same as Meta POST (less detail).
            Then open{" "}
            <Link href="/inbox" className="text-emerald-600 hover:underline">
              Inbox
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle>Last result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EnvPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        ok ? "border-emerald-100 bg-emerald-50/50" : "border-slate-100 bg-slate-50"
      )}
    >
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <XCircle className="h-4 w-4 text-slate-400" />
      )}
      <span className={ok ? "text-emerald-900" : "text-slate-600"}>{label}</span>
    </div>
  );
}
