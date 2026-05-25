"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  FlaskConical,
  Loader2,
  Play,
  Radio,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebhookUrlField } from "@/components/shared/webhook-url-field";
import { cn } from "@/lib/utils";

interface WebhookEvent {
  created_at: string;
  fields: string | null;
  messages_count: number;
  warning: string | null;
  first_result: string | null;
}

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
  recentWebhooks?: WebhookEvent[];
}

interface LiveStatus {
  at: string;
  readyForAutoReply: boolean;
  serviceRoleOk: boolean;
  businessCount: number;
  lastWebhookAt: string | null;
  lastWebhookMessages: number;
  lastWebhookResult: string | null;
  lastWebhookWarning: string | null;
  hints: string[];
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
  const [liveMonitor, setLiveMonitor] = useState(true);
  const [live, setLive] = useState<LiveStatus | null>(null);

  function loadMeta() {
    fetch("/api/setup/webhook-test", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setMeta(data);
        if (data.expectedVerifyToken) {
          setVerifyToken(data.expectedVerifyToken);
        }
      })
      .catch(() => {});
  }

  function loadLive() {
    fetch("/api/setup/webhook-live", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setLive(data);
        if (data.recentWebhooks?.length) {
          setMeta((m) =>
            m ? { ...m, recentWebhooks: data.recentWebhooks } : m
          );
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (!liveMonitor) return;
    loadLive();
    const id = setInterval(() => {
      loadLive();
      loadMeta();
    }, 4000);
    return () => clearInterval(id);
  }, [liveMonitor]);

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

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-amber-950">Why internal test works but real WhatsApp does not</CardTitle>
          <CardDescription className="text-amber-900/80">
            These are different code paths — use Live monitor after a real message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-amber-950">
          <p>
            <strong>Internal simulate</strong> calls your app directly (no Meta). It
            builds the payload using your env <code className="text-xs">WHATSAPP_PHONE_ID</code>,
            so phone ID always matches and <strong>no signature</strong> is checked.
          </p>
          <p>
            <strong>Real WhatsApp</strong> POSTs from Meta to your public URL with{" "}
            <code className="text-xs">X-Hub-Signature-256</code>. If{" "}
            <code className="text-xs">WHATSAPP_APP_SECRET</code> on Vercel ≠ Meta App
            Secret → <strong>401</strong> (nothing saved, no reply). If env phone ID ≠
            Meta&apos;s <code className="text-xs">phone_number_id</code> in the payload →
            replies failed before a recent fix; redeploy after pull.
          </p>
          <p>
            Run <strong>POST to live endpoint</strong> below (with signature) to test
            the same path as Meta. Check <strong>Recent Meta webhook calls</strong> for{" "}
            <code className="text-xs">signature_rejected</code>.
          </p>
        </CardContent>
      </Card>

      <Card className="border-emerald-200">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio
                className={cn(
                  "h-5 w-5",
                  liveMonitor ? "text-emerald-600 animate-pulse" : "text-slate-400"
                )}
              />
              Live monitor
            </CardTitle>
            <CardDescription>
              Refreshes every 4s. Send a WhatsApp message, then watch for a new
              row and <strong>sent | ai</strong> in the result.
            </CardDescription>
          </div>
          <Button
            variant={liveMonitor ? "default" : "outline"}
            size="sm"
            onClick={() => setLiveMonitor((v) => !v)}
          >
            {liveMonitor ? "On" : "Off"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {live ? (
            <>
              <div className="flex flex-wrap gap-2">
                <LivePill ok={live.serviceRoleOk} label="Service role" />
                <LivePill ok={live.businessCount > 0} label="Business row" />
                <LivePill ok={live.readyForAutoReply} label="Auto-reply ready" />
              </div>
              <p className="text-slate-600">
                Last Meta call:{" "}
                <strong>
                  {live.lastWebhookAt
                    ? new Date(live.lastWebhookAt).toLocaleString()
                    : "Never — Meta is not reaching your server"}
                </strong>
              </p>
              {live.lastWebhookAt && (
                <p className="text-slate-600">
                  Messages in payload: <strong>{live.lastWebhookMessages}</strong>
                  {live.lastWebhookResult && (
                    <> · Result: <code className="text-xs">{live.lastWebhookResult}</code></>
                  )}
                </p>
              )}
              {live.lastWebhookWarning && (
                <p className="text-amber-800">Warning: {live.lastWebhookWarning}</p>
              )}
              {live.hints?.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-amber-900">
                  {live.hints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-slate-500">Loading live status…</p>
          )}
        </CardContent>
      </Card>

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

      {meta?.recentWebhooks && meta.recentWebhooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Meta webhook calls</CardTitle>
            <CardDescription>
              If empty after you message WhatsApp, Meta is not reaching your server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {meta.recentWebhooks.map((ev, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <p className="font-mono text-xs text-slate-500">
                  {new Date(ev.created_at).toLocaleString()}
                </p>
                <p>
                  Fields: <strong>{ev.fields ?? "—"}</strong> · Messages:{" "}
                  <strong>{ev.messages_count}</strong>
                </p>
                {ev.warning && (
                  <p className="text-amber-700">Warning: {ev.warning}</p>
                )}
                {ev.first_result && (
                  <p className="text-slate-600">{ev.first_result}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {meta?.recentWebhooks?.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="py-4 text-sm text-amber-900">
            No Meta webhook calls logged yet. Run SQL for{" "}
            <code className="text-xs">webhook_events</code> table in Supabase, then
            message your WhatsApp number and refresh this page.
          </CardContent>
        </Card>
      )}

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

function LivePill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
      )}
    >
      {label}
    </span>
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
