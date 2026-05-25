"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { REPLY_LANGUAGES, type ReplyLanguageCode } from "@/constants/industry-presets";

export function ReplyLanguageCard() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: current, isLoading } = useQuery({
    queryKey: ["integration-status"],
    queryFn: async () => {
      const res = await fetch("/api/setup/status", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ replyLanguage: string }>;
    },
  });

  const [selected, setSelected] = useState<ReplyLanguageCode>("auto");

  useEffect(() => {
    if (current?.replyLanguage) {
      setSelected(current.replyLanguage as ReplyLanguageCode);
    }
  }, [current?.replyLanguage]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/integrations/reply-language", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyLanguage: selected }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Saved — new AI replies will use this language rule.");
      void queryClient.invalidateQueries({ queryKey: ["integration-status"] });
    } else {
      const body = await res.json().catch(() => ({}));
      setMessage((body as { error?: string }).error ?? "Save failed");
    }
  }

  return (
    <Card id="reply-language">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="text-brand h-5 w-5" />
          Reply in customer&apos;s language
        </CardTitle>
        <CardDescription>
          Tell the AI which language to use on WhatsApp.{" "}
          <strong>Match customer</strong> is best for India — Hindi, English,
          Marathi, etc. in the same thread.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : (
          <>
            <div>
              <Label htmlFor="reply-lang">Default reply language</Label>
              <select
                id="reply-lang"
                className="mt-2 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={selected}
                onChange={(e) =>
                  setSelected(e.target.value as ReplyLanguageCode)
                }
              >
                {REPLY_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save language"}
            </Button>
            {message && (
              <p className="text-brand text-sm font-medium">{message}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
