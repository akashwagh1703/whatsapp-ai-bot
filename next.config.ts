import type { NextConfig } from "next";

const openRouterDefaultModel =
  process.env.OPENROUTER_DEFAULT_MODEL?.trim() ||
  process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL?.trim() ||
  "minimax/minimax-m2.5:free";

const nextConfig: NextConfig = {
  env: {
    // Single server env var; exposed to client for admin UI defaults.
    NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL: openRouterDefaultModel,
  },
};

export default nextConfig;
