"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { APP_NAME } from "@/constants";
import { applyCachedBranding } from "@/lib/branding-cache";
import { DEFAULT_BRANDING, type BrandingConfig } from "@/lib/branding";

export function useAuthBranding() {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);

  useEffect(() => {
    setBranding(applyCachedBranding());
  }, []);

  return branding;
}

export function AuthBrandPanel() {
  const branding = useAuthBranding();

  return (
    <div
      className="relative hidden flex-1 flex-col justify-between overflow-hidden p-12 text-white lg:flex"
      style={{
        background: `linear-gradient(165deg, #0f172a 0%, #0c1222 50%, color-mix(in srgb, ${branding.primaryColor} 18%, #0a1628) 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 15% 10%, rgba(var(--brand-primary-rgb), 0.22), transparent 55%),
            radial-gradient(ellipse 50% 40% at 85% 80%, rgba(var(--brand-secondary-rgb), 0.12), transparent 50%)
          `,
        }}
        aria-hidden
      />

      <div className="relative flex items-center gap-3">
        <div className="brand-logo-box flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl shadow-lg">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <MessageCircle className="h-7 w-7 text-white" strokeWidth={2.25} />
          )}
        </div>
        <span className="text-xl font-semibold">{branding.appName}</span>
      </div>

      <div className="relative max-w-md space-y-6">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
          style={{
            background: "rgba(var(--brand-primary-rgb), 0.15)",
            color: "color-mix(in srgb, var(--brand-primary) 55%, white)",
          }}
        >
          <Sparkles className="h-4 w-4" />
          AI-powered customer care
        </div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          Your WhatsApp assistant, always on.
        </h1>
        <p className="text-lg text-slate-400">
          Automate replies, capture leads, and stay in control — without the
          complexity.
        </p>
      </div>

      <p className="relative text-sm text-slate-500">
        {branding.appName !== APP_NAME
          ? `Powered by ${APP_NAME}`
          : "Trusted by modern businesses worldwide."}
      </p>
    </div>
  );
}

export function AuthMobileBrand() {
  const branding = useAuthBranding();

  return (
    <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
      <div className="brand-logo-box flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl">
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </div>
      <span className="text-lg font-bold text-slate-900">{branding.appName}</span>
    </div>
  );
}
