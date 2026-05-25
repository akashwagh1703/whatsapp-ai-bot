/** Structured console logging for WhatsApp webhook debugging (Vercel + local). */

const PREFIX = "[whatsapp-webhook]";

type LogData = Record<string, unknown>;

export function webhookLog(stage: string, data?: LogData) {
  const payload = data ? ` ${JSON.stringify(redactSecrets(data))}` : "";
  console.info(`${PREFIX} ${stage}${payload}`);
}

export function webhookWarn(stage: string, data?: LogData) {
  const payload = data ? ` ${JSON.stringify(redactSecrets(data))}` : "";
  console.warn(`${PREFIX} ${stage}${payload}`);
}

export function webhookError(stage: string, err: unknown, data?: LogData) {
  const msg = err instanceof Error ? err.message : String(err);
  const extra = data ? redactSecrets(data) : {};
  console.error(`${PREFIX} ${stage}`, { error: msg, ...extra });
}

/** Coerce typed summaries into log payloads. */
export function toLogData(value: object): LogData {
  return value as LogData;
}

function redactSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (/token|secret|key|authorization/i.test(k) && typeof v === "string") {
      out[k] = v.length > 4 ? `••••${v.slice(-4)}` : "••••";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redactSecrets(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `••••${digits.slice(-4)}`;
}
