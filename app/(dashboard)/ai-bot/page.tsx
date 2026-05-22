"use client";

import { useEffect, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AI_MODELS, AI_TONES, DEFAULT_AI_MODEL } from "@/constants";
import { createClient } from "@/lib/supabase/client";
import type { AiSettings, AiTone } from "@/types";
import { cn } from "@/lib/utils";

export default function AiBotPage() {
  const [settings, setSettings] = useState<Partial<AiSettings>>({
    enabled: true,
    tone: "professional",
    model: DEFAULT_AI_MODEL,
    human_handoff: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .maybeSingle();
      if (!business) return;
      const { data } = await supabase
        .from("ai_settings")
        .select("*")
        .eq("business_id", business.id)
        .maybeSingle();
      if (data) {
        setSettings({
          ...data,
          model: data.model?.trim() || DEFAULT_AI_MODEL,
        });
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .maybeSingle();
    if (!business) return;

    await supabase.from("ai_settings").upsert({
      business_id: business.id,
      ...settings,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          <Sparkles className="h-4 w-4" />
          Guided AI setup
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">AI Bot</h1>
        <p className="mt-1 text-slate-500">
          Teach your assistant how to represent your business — no technical
          knowledge required.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-600" />
              AI Assistant
            </CardTitle>
            <CardDescription>
              When enabled, your assistant replies to customers automatically.
            </CardDescription>
          </div>
          <Switch
            checked={!!settings.enabled}
            onCheckedChange={(enabled) =>
              setSettings((s) => ({ ...s, enabled }))
            }
          />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How should your assistant speak?</CardTitle>
          <CardDescription>Choose a tone that matches your brand.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {AI_TONES.map((tone) => (
            <button
              key={tone.value}
              type="button"
              onClick={() =>
                setSettings((s) => ({ ...s, tone: tone.value as AiTone }))
              }
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                settings.tone === tone.value
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              <p className="font-medium text-slate-900">{tone.label}</p>
              <p className="mt-1 text-sm text-slate-500">{tone.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI instructions</CardTitle>
          <CardDescription>
            Describe what your assistant should do — like training a new team
            member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Main prompt</Label>
            <Textarea
              className="mt-2 min-h-[120px]"
              placeholder="You help customers book appointments, answer questions about our services…"
              value={settings.prompt ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, prompt: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Business knowledge</Label>
            <Textarea
              className="mt-2 min-h-[160px]"
              placeholder="Services, pricing, hours, FAQs…"
              value={settings.business_knowledge ?? ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  business_knowledge: e.target.value,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI model</CardTitle>
          <CardDescription>Pick the intelligence behind your assistant.</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={settings.model}
            onChange={(e) =>
              setSettings((s) => ({ ...s, model: e.target.value }))
            }
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Human handoff</CardTitle>
            <CardDescription>
              Automatically pause AI when customers need a real person.
            </CardDescription>
          </div>
          <Switch
            checked={!!settings.human_handoff}
            onCheckedChange={(human_handoff) =>
              setSettings((s) => ({ ...s, human_handoff }))
            }
          />
        </CardHeader>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save AI settings"}
      </Button>
    </div>
  );
}
