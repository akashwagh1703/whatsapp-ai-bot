import { RATE_LIMIT } from "@/constants";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return { ok: true, remaining: RATE_LIMIT.maxRequests - 1 };
  }

  if (entry.count >= RATE_LIMIT.maxRequests) {
    return { ok: false, remaining: 0 };
  }

  entry.count += 1;
  return { ok: true, remaining: RATE_LIMIT.maxRequests - entry.count };
}
