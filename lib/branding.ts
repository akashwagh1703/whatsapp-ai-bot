import { APP_NAME } from "@/constants";
import type { Business } from "@/types";

export const DEFAULT_PRIMARY_COLOR = "#059669";
export const DEFAULT_SECONDARY_COLOR = "#0d9488";

export interface BrandingConfig {
  appName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  appName: APP_NAME,
  logoUrl: null,
  primaryColor: DEFAULT_PRIMARY_COLOR,
  secondaryColor: DEFAULT_SECONDARY_COLOR,
};

const HEX_RE = /^#([0-9A-Fa-f]{6})$/;

export function normalizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return HEX_RE.test(withHash) ? withHash.toLowerCase() : fallback;
}

export function hexToRgb(hex: string): string {
  const normalized = normalizeHexColor(hex, DEFAULT_PRIMARY_COLOR);
  const n = parseInt(normalized.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r}, ${g}, ${b}`;
}

export function brandingFromBusiness(
  business: Pick<
    Business,
    "name" | "logo_url" | "primary_color" | "secondary_color"
  > | null | undefined
): BrandingConfig {
  if (!business) return DEFAULT_BRANDING;

  const primaryColor = normalizeHexColor(
    business.primary_color ?? "",
    DEFAULT_PRIMARY_COLOR
  );
  const secondaryColor = normalizeHexColor(
    business.secondary_color ?? "",
    DEFAULT_SECONDARY_COLOR
  );

  return {
    appName: business.name?.trim() || APP_NAME,
    logoUrl: business.logo_url,
    primaryColor,
    secondaryColor,
  };
}

/** Applies CSS variables used by global brand utility classes. */
export function applyBrandingToDocument(branding: BrandingConfig) {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", branding.primaryColor);
  root.style.setProperty("--brand-secondary", branding.secondaryColor);
  root.style.setProperty("--brand-primary-rgb", hexToRgb(branding.primaryColor));
  root.style.setProperty(
    "--brand-secondary-rgb",
    hexToRgb(branding.secondaryColor)
  );
  root.style.setProperty("--primary", branding.primaryColor);
  document.title = `${branding.appName} — AI WhatsApp Assistant`;
}

export const LOGO_BUCKET = "business-assets";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
