import {
  applyBrandingToDocument,
  brandingFromBusiness,
  DEFAULT_BRANDING,
  type BrandingConfig,
} from "@/lib/branding";
import type { Business } from "@/types";

const STORAGE_KEY = "flowchat-branding-v1";

export function readBrandingCache(): BrandingConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrandingConfig;
    if (!parsed?.appName || !parsed?.primaryColor || !parsed?.secondaryColor) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeBrandingCache(branding: BrandingConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
  } catch {
    // ignore quota / private mode
  }
}

export function cacheBrandingFromBusiness(
  business: Pick<
    Business,
    "name" | "logo_url" | "primary_color" | "secondary_color"
  > | null | undefined
) {
  const branding = brandingFromBusiness(business);
  writeBrandingCache(branding);
  return branding;
}

/** Applies cached branding on public pages (login) or defaults. */
export function applyCachedBranding(): BrandingConfig {
  const branding = readBrandingCache() ?? DEFAULT_BRANDING;
  applyBrandingToDocument(branding);
  return branding;
}

export interface BrandingThemeExport {
  version: 1;
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  exportedAt: string;
}

export function buildThemeExport(
  branding: Pick<
    BrandingConfig,
    "appName" | "primaryColor" | "secondaryColor" | "logoUrl"
  >
): BrandingThemeExport {
  return {
    version: 1,
    appName: branding.appName,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    logoUrl: branding.logoUrl,
    exportedAt: new Date().toISOString(),
  };
}

export function parseThemeImport(
  data: unknown
): Omit<BrandingThemeExport, "version" | "exportedAt"> | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.appName !== "string" || typeof o.primaryColor !== "string") {
    return null;
  }
  if (typeof o.secondaryColor !== "string") return null;
  return {
    appName: o.appName.trim(),
    primaryColor: o.primaryColor.trim(),
    secondaryColor: o.secondaryColor.trim(),
    logoUrl:
      typeof o.logoUrl === "string" && o.logoUrl.trim()
        ? o.logoUrl.trim()
        : null,
  };
}
