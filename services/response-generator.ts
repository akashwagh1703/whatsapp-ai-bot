import type { FlowExecutionResult } from "@/types/flow";

export interface GeneratedResponse {
  text: string;
  source: "flow" | "ai" | "fallback";
  isAi: boolean;
  handoff?: boolean;
  flowMeta?: {
    flowSlug: string;
    stepId: string;
    sessionId?: string;
  };
  aiError?: string;
}

const DEFAULT_FALLBACK =
  "Thanks for reaching out! A team member will follow up shortly.";

/** Build final WhatsApp text from flow execution results. */
export function fromFlowExecution(
  execResults: FlowExecutionResult[],
  meta: { flowSlug: string; sessionId: string }
): GeneratedResponse | null {
  const texts = execResults.flatMap((r) => r.replyTexts).filter(Boolean);
  const combined = texts.join("\n\n").trim();
  if (!combined) return null;

  const last = execResults[execResults.length - 1];
  return {
    text: combined,
    source: "flow",
    isAi: false,
    flowMeta: {
      flowSlug: meta.flowSlug,
      stepId: last?.stepId ?? "",
      sessionId: meta.sessionId,
    },
  };
}

export function fromAi(text: string, aiError?: string): GeneratedResponse {
  return {
    text,
    source: aiError ? "fallback" : "ai",
    isAi: true,
    aiError,
  };
}

export function defaultFallback(custom?: string): GeneratedResponse {
  return {
    text: custom?.trim() || DEFAULT_FALLBACK,
    source: "fallback",
    isAi: false,
  };
}
