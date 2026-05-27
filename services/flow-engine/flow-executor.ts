/**
 * Centralized flow step executor — dynamic step processing, no hardcoded replies.
 */
import {
  getFirstStepId,
  getStepById,
} from "@/modules/flows/flow-repository";
import type {
  FlowExecutionResult,
  FlowRecord,
  FlowSessionRecord,
  FlowStep,
} from "@/types/flow";

function resolveNextStepId(
  flow: FlowRecord,
  step: FlowStep,
  preferred?: string | null
): string | null {
  if (preferred) return preferred;
  if (step.nextStepId) return step.nextStepId;
  const idx = flow.definition.steps.findIndex((s) => s.id === step.id);
  if (idx >= 0 && idx < flow.definition.steps.length - 1) {
    return flow.definition.steps[idx + 1].id;
  }
  return null;
}

function matchButton(
  step: FlowStep,
  userMessage: string
): { id: string; label: string; nextStepId?: string } | null {
  const lower = userMessage.trim().toLowerCase();
  for (const btn of step.buttons ?? []) {
    if (
      lower === btn.id.toLowerCase() ||
      lower === btn.label.toLowerCase() ||
      lower.includes(btn.label.toLowerCase())
    ) {
      return btn;
    }
  }
  return null;
}

function evaluateConditions(
  step: FlowStep,
  userMessage: string,
  data: Record<string, string>
): string | null {
  for (const rule of step.conditions ?? []) {
    const fieldVal =
      rule.field === "message"
        ? userMessage
        : data[rule.field] ?? "";
    const target = rule.value ?? "";
    let ok = false;
    if (rule.op === "equals") {
      ok = fieldVal.toLowerCase() === target.toLowerCase();
    } else if (rule.op === "contains") {
      ok = fieldVal.toLowerCase().includes(target.toLowerCase());
    } else if (rule.op === "exists") {
      ok = !!fieldVal.trim();
    }
    if (ok) return rule.nextStepId;
  }
  return step.defaultNextStepId ?? step.nextStepId ?? null;
}

export function executeFlowStep(params: {
  flow: FlowRecord;
  session: FlowSessionRecord;
  userMessage: string | null;
  isFlowStart?: boolean;
}): FlowExecutionResult {
  const { flow, session } = params;
  const userMessage = params.userMessage?.trim() ?? "";
  const step = getStepById(flow, session.current_step_id);

  if (!step) {
    return {
      replyTexts: ["Something went wrong. Let's start again — send hi."],
      nextStepId: getFirstStepId(flow),
      endSession: true,
      flowId: flow.id,
      flowSlug: flow.slug,
      stepId: session.current_step_id,
      stepType: "end",
    };
  }

  const data = { ...session.context.data };

  switch (step.type) {
    case "message": {
      const texts = step.text ? [step.text] : [];
      return {
        replyTexts: texts,
        nextStepId: resolveNextStepId(flow, step),
        endSession: false,
        contextPatch: { awaiting: null },
        flowId: flow.id,
        flowSlug: flow.slug,
        stepId: step.id,
        stepType: step.type,
      };
    }

    case "buttons": {
      if (session.context.awaiting === "button" && userMessage) {
        const btn = matchButton(step, userMessage);
        const next = btn?.nextStepId ?? step.defaultNextStepId ?? resolveNextStepId(flow, step);
        return {
          replyTexts: btn ? [] : ["Please choose one of the options above."],
          nextStepId: btn ? next : step.id,
          endSession: false,
          contextPatch: { awaiting: btn ? null : "button", data },
          flowId: flow.id,
          flowSlug: flow.slug,
          stepId: step.id,
          stepType: step.type,
        };
      }
      const labels = (step.buttons ?? []).map((b) => `• ${b.label}`).join("\n");
      const body = [step.text, labels ? `\n${labels}` : ""].filter(Boolean).join("");
      return {
        replyTexts: body ? [body] : [],
        nextStepId: step.id,
        endSession: false,
        contextPatch: { awaiting: "button", data },
        flowId: flow.id,
        flowSlug: flow.slug,
        stepId: step.id,
        stepType: step.type,
      };
    }

    case "list": {
      if (session.context.awaiting === "list" && userMessage) {
        const opt = (step.listOptions ?? []).find(
          (o) =>
            userMessage.toLowerCase().includes(o.title.toLowerCase()) ||
            userMessage.toLowerCase() === o.id.toLowerCase()
        );
        const next = opt?.nextStepId ?? step.defaultNextStepId ?? resolveNextStepId(flow, step);
        return {
          replyTexts: opt ? [] : ["Please pick an option from the list."],
          nextStepId: opt ? next : step.id,
          endSession: false,
          contextPatch: { awaiting: opt ? null : "list", data },
          flowId: flow.id,
          flowSlug: flow.slug,
          stepId: step.id,
          stepType: step.type,
        };
      }
      const lines = (step.listOptions ?? []).map(
        (o, i) => `${i + 1}. ${o.title}${o.description ? ` — ${o.description}` : ""}`
      );
      const body = [step.text, lines.join("\n")].filter(Boolean).join("\n\n");
      return {
        replyTexts: [body],
        nextStepId: step.id,
        endSession: false,
        contextPatch: { awaiting: "list", data },
        flowId: flow.id,
        flowSlug: flow.slug,
        stepId: step.id,
        stepType: step.type,
      };
    }

    case "input": {
      const key = step.collectKey ?? step.id;
      if (session.context.awaiting === "input" && userMessage) {
        data[key] = userMessage;
        return {
          replyTexts: step.text ? [step.text] : [],
          nextStepId: resolveNextStepId(flow, step),
          endSession: false,
          contextPatch: { awaiting: null, data },
          flowId: flow.id,
          flowSlug: flow.slug,
          stepId: step.id,
          stepType: step.type,
        };
      }
      return {
        replyTexts: [step.prompt ?? step.text ?? "Please reply with your answer."],
        nextStepId: step.id,
        endSession: false,
        contextPatch: { awaiting: "input", data },
        flowId: flow.id,
        flowSlug: flow.slug,
        stepId: step.id,
        stepType: step.type,
      };
    }

    case "condition": {
      const next = evaluateConditions(step, userMessage, data);
      return {
        replyTexts: [],
        nextStepId: next,
        endSession: !next,
        contextPatch: { awaiting: null, data },
        flowId: flow.id,
        flowSlug: flow.slug,
        stepId: step.id,
        stepType: step.type,
      };
    }

    case "api": {
      return {
        replyTexts: [
          step.text ??
            "Processing your request… (API steps are queued for a future worker.)",
        ],
        nextStepId: resolveNextStepId(flow, step),
        endSession: false,
        contextPatch: { awaiting: null, data },
        flowId: flow.id,
        flowSlug: flow.slug,
        stepId: step.id,
        stepType: step.type,
      };
    }

    case "end":
    default:
      return {
        replyTexts: [
          step.text ?? "Thank you! We'll be in touch if you need anything else.",
        ],
        nextStepId: null,
        endSession: true,
        contextPatch: { awaiting: null, data },
        flowId: flow.id,
        flowSlug: flow.slug,
        stepId: step.id,
        stepType: "end",
      };
  }
}

/** Run steps that auto-advance (message/condition with no wait) until wait or end. */
export function collectRepliesForTransition(params: {
  flow: FlowRecord;
  startStepId: string;
  userMessage: string | null;
  session: FlowSessionRecord;
  maxHops?: number;
}): FlowExecutionResult[] {
  const results: FlowExecutionResult[] = [];
  let session = params.session;
  let stepId: string | null = params.startStepId;
  let hops = 0;
  const maxHops = params.maxHops ?? 8;

  while (stepId && hops < maxHops) {
    session = { ...session, current_step_id: stepId };
    const result = executeFlowStep({
      flow: params.flow,
      session,
      userMessage: hops === 0 ? params.userMessage : null,
      isFlowStart: hops === 0,
    });
    results.push(result);

    if (result.endSession || !result.nextStepId) break;
    const step = getStepById(params.flow, stepId);
    const waiting =
      result.contextPatch?.awaiting ||
      step?.type === "buttons" ||
      step?.type === "input" ||
      step?.type === "list";
    if (waiting && result.replyTexts.length > 0) break;
    if (waiting && result.contextPatch?.awaiting) break;

    stepId = result.nextStepId;
    hops++;
  }

  return results;
}
