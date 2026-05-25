"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { Building2, Loader2, Store, Stethoscope, Home, GraduationCap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INDUSTRY_PRESETS } from "@/constants/industry-presets";

const ICONS: Record<string, LucideIcon> = {
  general: Building2,
  restaurant: Store,
  clinic: Stethoscope,
  real_estate: Home,
  coaching: GraduationCap,
};

export function IndustryPresets() {
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function applyPreset(presetId: string) {
    setApplying(presetId);
    setMessage(null);
    const res = await fetch("/api/integrations/apply-preset", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presetId }),
    });
    const body = await res.json().catch(() => ({}));
    setApplying(null);
    if (res.ok) {
      setMessage((body as { message?: string }).message ?? "Preset applied.");
      void queryClient.invalidateQueries({ queryKey: ["integration-status"] });
    } else {
      setMessage((body as { error?: string }).error ?? "Could not apply preset");
    }
  }

  return (
    <Card id="industry-presets">
      <CardHeader>
        <CardTitle>Pre-built business setups</CardTitle>
        <CardDescription>
          One click fills AI prompt, welcome message, keywords, and language.
          Edit placeholders in{" "}
          <a href="/ai-bot" className="text-brand font-medium hover:opacity-80">
            AI Bot
          </a>{" "}
          after applying.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {INDUSTRY_PRESETS.map((preset) => {
            const Icon = ICONS[preset.id] ?? Building2;
            const busy = applying === preset.id;
            return (
              <div
                key={preset.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-brand-soft text-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{preset.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {preset.description}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className={cn("mt-4 w-full")}
                  disabled={!!applying}
                  onClick={() => applyPreset(preset.id)}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying…
                    </>
                  ) : (
                    "Apply setup"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        {message && (
          <p className="text-brand text-sm font-medium">{message}</p>
        )}
      </CardContent>
    </Card>
  );
}
