"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AI_MODELS, DEFAULT_AI_MODEL } from "@/constants";
import { createClient } from "@/lib/supabase/client";
import { WebhookUrlField } from "@/components/shared/webhook-url-field";

export default function SettingsPage() {
  const [business, setBusiness] = useState({
    name: "",
    email: "",
    phone: "",
    logo_url: "",
  });
  const [api, setApi] = useState({
    openrouter_api_key: "",
    openrouter_model: DEFAULT_AI_MODEL,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: biz } = await supabase.from("businesses").select("*").maybeSingle();
      if (biz) {
        setBusiness({
          name: biz.name,
          email: biz.email ?? "",
          phone: biz.phone ?? "",
          logo_url: biz.logo_url ?? "",
        });
        const { data: app } = await supabase
          .from("app_settings")
          .select("openrouter_api_key, openrouter_model")
          .eq("business_id", biz.id)
          .maybeSingle();
        if (app) {
          setApi({
            openrouter_api_key: app.openrouter_api_key ?? "",
            openrouter_model:
              app.openrouter_model?.trim() || DEFAULT_AI_MODEL,
          });
        }
      }
    }
    load();
  }, []);

  async function saveGeneral() {
    setSaving(true);
    const supabase = createClient();
    const { data: biz } = await supabase.from("businesses").select("id").maybeSingle();
    if (!biz) return;
    await supabase
      .from("businesses")
      .update({
        name: business.name,
        email: business.email || null,
        phone: business.phone || null,
        logo_url: business.logo_url || null,
      })
      .eq("id", biz.id);
    setSaving(false);
  }

  async function saveAiSettings() {
    setSaving(true);
    const supabase = createClient();
    const { data: biz } = await supabase.from("businesses").select("id").maybeSingle();
    if (!biz) return;
    await supabase.from("app_settings").upsert({
      business_id: biz.id,
      openrouter_api_key: api.openrouter_api_key || null,
      openrouter_model: api.openrouter_model || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-slate-500">
          Business profile and AI keys. WhatsApp uses environment variables only.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Your business identity on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Business name</Label>
                <Input
                  className="mt-2"
                  value={business.name}
                  onChange={(e) =>
                    setBusiness((b) => ({ ...b, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  className="mt-2"
                  value={business.logo_url}
                  onChange={(e) =>
                    setBusiness((b) => ({ ...b, logo_url: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  className="mt-2"
                  type="email"
                  value={business.email}
                  onChange={(e) =>
                    setBusiness((b) => ({ ...b, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  className="mt-2"
                  value={business.phone}
                  onChange={(e) =>
                    setBusiness((b) => ({ ...b, phone: e.target.value }))
                  }
                />
              </div>
              <Button onClick={saveGeneral} disabled={saving}>
                Save general
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>OpenRouter</CardTitle>
              <CardDescription>
                Optional here if you already set OPENROUTER_API_KEY in Vercel / .env.local.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>API key</Label>
                <Input
                  className="mt-2"
                  type="password"
                  value={api.openrouter_api_key}
                  onChange={(e) =>
                    setApi((a) => ({ ...a, openrouter_api_key: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Default model (override)</Label>
                <select
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  value={api.openrouter_model}
                  onChange={(e) =>
                    setApi((a) => ({ ...a, openrouter_model: e.target.value }))
                  }
                >
                  {AI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={saveAiSettings} disabled={saving}>
                Save AI settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp (environment only)</CardTitle>
              <CardDescription>
                Credentials are not stored in the dashboard. Set them in Vercel or .env.local.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-700">
                <p>WHATSAPP_PHONE_ID=</p>
                <p>WHATSAPP_TOKEN=</p>
                <p>WHATSAPP_VERIFY_TOKEN=</p>
                <p className="mt-2 text-slate-500">
                  Default verify token if unset: flowchat-verify
                </p>
              </div>
              <div>
                <Label>Webhook URL (for Meta)</Label>
                <div className="mt-2">
                  <WebhookUrlField />
                </div>
              </div>
              <p className="text-sm text-slate-500">
                After updating env vars on Vercel, redeploy. Configure webhook in{" "}
                <strong>Integrations</strong> or Meta Developer Console.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
