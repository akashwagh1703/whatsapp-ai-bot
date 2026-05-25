"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Automations, KeywordReply } from "@/types";

export default function AutomationsPage() {
  const [data, setData] = useState<Partial<Automations>>({
    welcome_enabled: false,
    away_enabled: false,
    keyword_replies: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .maybeSingle();
      if (!business) return;
      const { data: row } = await supabase
        .from("automations")
        .select("*")
        .eq("business_id", business.id)
        .maybeSingle();
      if (row) setData(row);
    }
    load();
  }, []);

  function updateKeyword(index: number, field: keyof KeywordReply, value: string) {
    const list = [...(data.keyword_replies ?? [])];
    list[index] = { ...list[index], [field]: value };
    setData((d) => ({ ...d, keyword_replies: list }));
  }

  function addKeyword() {
    setData((d) => ({
      ...d,
      keyword_replies: [
        ...(d.keyword_replies ?? []),
        { keyword: "", reply: "" },
      ],
    }));
  }

  function removeKeyword(index: number) {
    const list = [...(data.keyword_replies ?? [])];
    list.splice(index, 1);
    setData((d) => ({ ...d, keyword_replies: list }));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .maybeSingle();
    if (!business) return;
    await supabase.from("automations").upsert({
      business_id: business.id,
      ...data,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Automations</h1>
        <p className="mt-1 text-slate-500">
          Simple messages that run while you focus on your business.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Welcome message</CardTitle>
            <CardDescription>
              Greet new customers when they message you for the first time.
            </CardDescription>
          </div>
          <Switch
            checked={!!data.welcome_enabled}
            onCheckedChange={(welcome_enabled) =>
              setData((d) => ({ ...d, welcome_enabled }))
            }
          />
        </CardHeader>
        {data.welcome_enabled && (
          <CardContent>
            <Textarea
              placeholder="Hi! Thanks for reaching out. How can we help you today?"
              value={data.welcome_message ?? ""}
              onChange={(e) =>
                setData((d) => ({ ...d, welcome_message: e.target.value }))
              }
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Away message</CardTitle>
            <CardDescription>
              When enabled, sends this message instead of the AI bot (keywords
              still apply first). Turn off when you want AI auto-reply again.
            </CardDescription>
          </div>
          <Switch
            checked={!!data.away_enabled}
            onCheckedChange={(away_enabled) =>
              setData((d) => ({ ...d, away_enabled }))
            }
          />
        </CardHeader>
        {data.away_enabled && (
          <CardContent>
            <Textarea
              placeholder="We're away right now and will reply as soon as we're back."
              value={data.away_message ?? ""}
              onChange={(e) =>
                setData((d) => ({ ...d, away_message: e.target.value }))
              }
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-600" />
            Keyword auto replies
          </CardTitle>
          <CardDescription>
            When a message contains a keyword, send an instant reply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.keyword_replies ?? []).map((row, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-end"
            >
              <div className="flex-1 space-y-2">
                <Label>Keyword</Label>
                <Input
                  placeholder="pricing"
                  value={row.keyword}
                  onChange={(e) =>
                    updateKeyword(i, "keyword", e.target.value)
                  }
                />
              </div>
              <div className="flex-[2] space-y-2">
                <Label>Reply</Label>
                <Input
                  placeholder="Our plans start at $29/month…"
                  value={row.reply}
                  onChange={(e) => updateKeyword(i, "reply", e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeKeyword(i)}
              >
                <Trash2 className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addKeyword}>
            <Plus className="h-4 w-4" />
            Add keyword
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save automations"}
      </Button>
    </div>
  );
}
