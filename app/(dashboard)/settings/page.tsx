"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { WebhookUrlField } from "@/components/shared/webhook-url-field";
import { EnvCredentialsStatus } from "@/components/settings/env-credentials-status";

export default function SettingsPage() {
  const [business, setBusiness] = useState({
    name: "",
    email: "",
    phone: "",
    logo_url: "",
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-slate-500">
          Business profile here. WhatsApp & OpenRouter use{" "}
          <code className="text-xs">.env.local</code> / Vercel only — never the
          database.
        </p>
      </div>

      <Tabs defaultValue="environment">
        <TabsList>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="environment">
          <Card>
            <CardHeader>
              <CardTitle>Environment credentials</CardTitle>
              <CardDescription>
                Status is read from the running server. Edit{" "}
                <strong>.env.local</strong> locally or Vercel{" "}
                <strong>Production</strong>, then restart / redeploy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <EnvCredentialsStatus />
              <div>
                <Label>Webhook URL (Meta)</Label>
                <div className="mt-2">
                  <WebhookUrlField />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-700">
                <p>WHATSAPP_PHONE_ID=</p>
                <p>WHATSAPP_TOKEN=</p>
                <p>WHATSAPP_VERIFY_TOKEN=</p>
                <p>OPENROUTER_API_KEY=</p>
                <p>OPENROUTER_DEFAULT_MODEL=</p>
                <p>NEXT_PUBLIC_APP_URL=</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
      </Tabs>
    </div>
  );
}
