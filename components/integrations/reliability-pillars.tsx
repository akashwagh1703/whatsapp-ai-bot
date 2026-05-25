"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReliabilityPillar } from "@/services/integration-status.service";

export function ReliabilityPillars({
  pillars,
  score,
  total = 7,
}: {
  pillars: ReliabilityPillar[];
  score: number;
  total?: number;
}) {
  const allCore = pillars
    .filter((p) => ["webhook", "ai", "inbox"].includes(p.id))
    .every((p) => p.ok);

  return (
    <Card id="works-reliably">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="text-brand h-5 w-5" />
          Works reliably
        </CardTitle>
        <CardDescription>
          Core pillars for a businessman: messages arrive, AI replies, team sees
          chats — plus leads, alerts, and your brand.{" "}
          <strong>
            {score}/{total} active
          </strong>
          {allCore ? " — core stack is ready." : " — finish webhook + AI first."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {pillars.map((pillar) => (
            <Link
              key={pillar.id}
              href={pillar.href}
              className={cn(
                "flex gap-3 rounded-xl border p-4 transition hover:shadow-sm",
                pillar.ok
                  ? "border-emerald-100 bg-emerald-50/30"
                  : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
              )}
            >
              {pillar.ok ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-300" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{pillar.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {pillar.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
