"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  applyBrandingToDocument,
  brandingFromBusiness,
  DEFAULT_BRANDING,
  type BrandingConfig,
} from "@/lib/branding";
import { useBusiness } from "@/hooks/use-business";
import { writeBrandingCache } from "@/lib/branding-cache";

interface BrandingContextValue extends BrandingConfig {
  isLoading: boolean;
  refresh: () => void;
}

const BrandingContext = createContext<BrandingContextValue>({
  ...DEFAULT_BRANDING,
  isLoading: true,
  refresh: () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: business, isLoading, refetch } = useBusiness();

  const branding = useMemo(
    () => brandingFromBusiness(business ?? undefined),
    [business]
  );

  useEffect(() => {
    applyBrandingToDocument(branding);
    writeBrandingCache(branding);
  }, [branding]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      ...branding,
      isLoading,
      refresh: () => {
        void refetch();
        void queryClient.invalidateQueries({ queryKey: ["business"] });
      },
    }),
    [branding, isLoading, refetch, queryClient]
  );

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
