/** Flow/rule engine is always enabled. */

export function isFlowEngineEnabled(): boolean {
  return true;
}

/** Session expires after N hours of inactivity */
export function getFlowSessionTtlHours(): number {
  const n = Number(process.env.FLOW_SESSION_TTL_HOURS ?? "24");
  return Number.isFinite(n) && n > 0 ? n : 24;
}
