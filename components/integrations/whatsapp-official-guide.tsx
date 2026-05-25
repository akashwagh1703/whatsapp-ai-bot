"use client";

import { BadgeCheck, ExternalLink, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const STEPS = [
  {
    title: "Use a business phone number",
    body: "Register WhatsApp Business API with a number you control (not a personal account linked to consumer WhatsApp only).",
  },
  {
    title: "Complete Meta Business Verification",
    body: "In Meta Business Suite → Business settings → Security Center, submit legal business name, address, and documents. Verification can take a few days.",
  },
  {
    title: "Build message quality",
    body: "Send helpful replies, avoid spam, honour opt-outs. Low blocks and reports improve trust with Meta.",
  },
  {
    title: "Apply for Official Business Account (green tick)",
    body: "After verification and healthy usage, request OBA in Meta Business Manager → WhatsApp Accounts → your number → Official Business Account. Meta approves based on brand recognition — not guaranteed for all businesses.",
  },
  {
    title: "Display name & profile",
    body: "Set a clear display name matching your brand (as on website or documents). Mismatched names delay or reject the green tick.",
  },
];

export function WhatsAppOfficialGuide() {
  return (
    <Card id="whatsapp-official">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck className="text-brand h-5 w-5" />
          WhatsApp green tick & official number
        </CardTitle>
        <CardDescription>
          Guidance for business owners — the green badge is granted by Meta, not
          by this app. Your bot works with a standard WhatsApp Business API number
          while you work toward verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Important</p>
          <p className="mt-1 text-amber-800/90">
            FlowChat connects via{" "}
            <strong>Meta Cloud API</strong>. You still need{" "}
            <code className="text-xs">WHATSAPP_PHONE_ID</code> and{" "}
            <code className="text-xs">WHATSAPP_TOKEN</code> from Meta → WhatsApp
            → API Setup — whether or not you have the green tick.
          </p>
        </div>

        <ol className="space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="bg-brand-soft text-brand flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-slate-900">{step.title}</p>
                <p className="mt-1 text-sm text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-3">
          <a
            href="https://business.facebook.com/settings/security"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "inline-flex"
            )}
          >
            <ExternalLink className="h-4 w-4" />
            Business verification
          </a>
          <a
            href="https://developers.facebook.com/docs/whatsapp/overview/business-accounts/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex"
            )}
          >
            <Phone className="h-4 w-4" />
            Meta WhatsApp docs
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
