"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnvCredentialsStatus } from "@/components/settings/env-credentials-status";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { WebhookUrlField } from "@/components/shared/webhook-url-field";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-slate-500">
          Brand your workspace, then manage environment credentials for WhatsApp
          and AI.
        </p>
      </div>

      <Tabs defaultValue="appearance">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="environment" className="mt-6">
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
                <p>WHATSAPP_APP_SECRET=</p>
                <p>OPENROUTER_API_KEY=</p>
                <p>OPENROUTER_DEFAULT_MODEL=</p>
                <p>NEXT_PUBLIC_APP_URL=</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
