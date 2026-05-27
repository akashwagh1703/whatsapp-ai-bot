/** Flow engine feature flags (env). */

export function isFlowEngineEnabled(): boolean {
  const v = process.env.FLOW_ENGINE_ENABLED?.trim().toLowerCase();
  if (v === "false" || v === "0") return false;
  return true;
}

/** Session expires after N hours of inactivity */
export function getFlowSessionTtlHours(): number {
  const n = Number(process.env.FLOW_SESSION_TTL_HOURS ?? "24");
  return Number.isFinite(n) && n > 0 ? n : 24;
}
