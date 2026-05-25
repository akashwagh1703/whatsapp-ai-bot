"use client";

import { useEffect, useState } from "react";
import { Copy, Plug } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { INTEGRATION_EVENTS } from "@/constants";
import { createClient } from "@/lib/supabase/client";
import { SetupChecklist } from "@/components/integrations/setup-checklist";
import { IndustryPresets } from "@/components/integrations/industry-presets";
import { ReplyLanguageCard } from "@/components/integrations/reply-language-card";
import { WhatsAppOfficialGuide } from "@/components/integrations/whatsapp-official-guide";
import { cn } from "@/lib/utils";

export default function IntegrationsPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [events, setEvents] = useState<string[]>([
    "new_message",
    "new_lead",
    "ai_handoff",
  ]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .maybeSingle();
      if (!business) return;
      const { data } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("business_id", business.id)
        .maybeSingle();
      if (data) {
        setWebhookUrl(data.webhook_url ?? "");
        setApiToken(data.api_token ?? "");
        setEvents((data.events as string[]) ?? events);
      }
    }
    load();
  }, []);

  function toggleEvent(value: string) {
    setEvents((prev) =>
      prev.includes(value)
        ? prev.filter((e) => e !== value)
        : [...prev, value]
    );
  }

  async function handleSave() {
    const supabase = createClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .maybeSingle();
    if (!business) return;
    await supabase.from("integration_settings").upsert({
      business_id: business.id,
      webhook_url: webhookUrl || null,
      events,
      updated_at: new Date().toISOString(),
    });
  }

  function copyToken() {
    navigator.clipboard.writeText(apiToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="mt-1 text-slate-500">
          Connect WhatsApp for reliable auto-reply, set your language and
          industry template, and optional CRM webhooks.
        </p>
      </div>

      <SetupChecklist />

      <IndustryPresets />

      <ReplyLanguageCard />

      <WhatsAppOfficialGuide />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="text-brand h-5 w-5" />
            Outbound webhooks (optional)
          </CardTitle>
          <CardDescription>
            Notify your CRM or other tools when events happen in FlowChat AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Your webhook URL</Label>
            <Input
              className="mt-2"
              placeholder="https://your-app.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>
          <div>
            <Label>API token</Label>
            <div className="mt-2 flex gap-2">
              <Input readOnly value={apiToken} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyToken}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copied && (
              <p className="text-brand mt-1 text-xs">Copied!</p>
            )}
          </div>
          <div>
            <Label className="mb-3 block">Events</Label>
            <div className="flex flex-wrap gap-2">
              {INTEGRATION_EVENTS.map((ev) => (
                <button
                  key={ev.value}
                  type="button"
                  onClick={() => toggleEvent(ev.value)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    events.includes(ev.value)
                      ? "btn-brand"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSave}>Save outbound webhooks</Button>
        </CardContent>
      </Card>
    </div>
  );
}
