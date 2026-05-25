"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/providers/branding-provider";

export function BrandLogo({
  size = "md",
  showName = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}) {
  const { appName, logoUrl } = useBranding();

  const box =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-12 w-12" : "h-11 w-11";
  const icon =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-7 w-7" : "h-6 w-6";

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "brand-logo-box relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-lg",
          box
        )}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`${appName} logo`}
            className="h-full w-full object-cover"
          />
        ) : (
          <MessageCircle className={cn("text-white", icon)} strokeWidth={2.25} />
        )}
      </div>
      {showName && (
        <div className="min-w-0">
          <p className="truncate text-base font-bold tracking-tight text-white">
            {appName}
          </p>
          <p className="text-[11px] font-medium text-brand-accent">
            WhatsApp AI
          </p>
        </div>
      )}
    </div>
  );
}
