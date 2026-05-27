/**
 * Inbound message pipeline — flow engine first, legacy auto-reply fallback.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { isFlowEngineEnabled } from "@/config/flow-engine";
import {
  getFirstStepId,
} from "@/modules/flows/flow-repository";
import { routeInboundMessage } from "@/modules/router/message-router";
import { startSession, updateSession } from "@/modules/sessions/session-service";
import { collectRepliesForTransition } from "@/services/flow-engine/flow-executor";
import { ensureDefaultFlows } from "@/services/flow-engine/flow-seed.service";
import { resolveAutoReply } from "@/services/reply-resolver.service";
import { webhookLog, webhookWarn } from "@/lib/webhook-debug";
import type { ParsedInboundMessage } from "@/types/whatsapp-webhook";
import type { AiSettings, Automations, Conversation } from "@/types";
import type { ResolvedAutoReply } from "@/types/whatsapp-webhook";

export interface PipelineResult {
  handledBy: "flow" | "legacy";
  resolvedReply: ResolvedAutoReply;
  flowMeta?: {
    flowSlug: string;
    stepId: string;
    sessionId?: string;
  };
}

export async function processMessagePipeline(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    conversation: Conversation;
    contactId: string;
    msg: ParsedInboundMessage;
    aiSettings: AiSettings;
    automations: Automations | null;
  }
): Promise<PipelineResult> {
  if (
    params.automations?.away_enabled &&
    params.automations.away_message?.trim()
  ) {
    return {
      handledBy: "legacy",
      resolvedReply: {
        text: params.automations.away_message.trim(),
        source: "away",
        isAi: false,
      },
    };
  }

  if (!isFlowEngineEnabled()) {
    const resolvedReply = await resolveAutoReply(supabase, {
      businessId: params.businessId,
      conversation: params.conversation,
      msg: params.msg,
      aiSettings: params.aiSettings,
      automations: params.automations,
    });
    return { handledBy: "legacy", resolvedReply };
  }

  try {
    await ensureDefaultFlows(supabase, params.businessId);
  } catch (e) {
    webhookWarn("flow_seed_failed", {
      error: e instanceof Error ? e.message : "seed failed",
    });
  }

  const route = await routeInboundMessage(supabase, {
    businessId: params.businessId,
    conversationId: params.conversation.id,
    messageText: params.msg.content,
  });

  if (route.action === "legacy") {
    const resolvedReply = await resolveAutoReply(supabase, {
      businessId: params.businessId,
      conversation: params.conversation,
      msg: params.msg,
      aiSettings: params.aiSettings,
      automations: params.automations,
    });
    return { handledBy: "legacy", resolvedReply };
  }

  const flow = route.flow;
  let session =
    route.action === "continue_flow"
      ? route.session
      : null;

  if (route.action === "start_flow") {
    const firstStepId = getFirstStepId(flow);
    if (!firstStepId) {
      webhookWarn("flow_empty", { flowSlug: flow.slug });
      return fallbackLegacy(supabase, params);
    }
    session = await startSession(supabase, {
      businessId: params.businessId,
      conversationId: params.conversation.id,
      contactId: params.contactId,
      flowId: flow.id,
      firstStepId,
      flowSlug: flow.slug,
    });
  }

  if (!session) {
    return fallbackLegacy(supabase, params);
  }

  const execResults = collectRepliesForTransition({
    flow,
    startStepId: session.current_step_id,
    userMessage: params.msg.content,
    session,
  });

  const last = execResults[execResults.length - 1];
  if (!last) {
    return fallbackLegacy(supabase, params);
  }

  const replyTexts = execResults.flatMap((r) => r.replyTexts).filter(Boolean);
  const combined = replyTexts.join("\n\n").trim();

  const mergedContext = {
    ...session.context,
    ...last.contextPatch,
    data: {
      ...session.context.data,
      ...(last.contextPatch?.data ?? {}),
    },
    awaiting: last.contextPatch?.awaiting ?? session.context.awaiting,
  };

  if (last.endSession) {
    await updateSession(supabase, session.id, {
      status: "completed",
      context: mergedContext,
    });
  } else if (last.nextStepId) {
    await updateSession(supabase, session.id, {
      currentStepId: last.nextStepId,
      context: mergedContext,
    });
  } else {
    await updateSession(supabase, session.id, { context: mergedContext });
  }

  webhookLog("flow_pipeline_complete", {
    flowSlug: flow.slug,
    stepId: last.stepId,
    replyLength: combined.length,
    endSession: last.endSession,
  });

  if (!combined) {
    return fallbackLegacy(supabase, params);
  }

  return {
    handledBy: "flow",
    resolvedReply: {
      text: combined,
      source: "flow",
      isAi: false,
    },
    flowMeta: {
      flowSlug: flow.slug,
      stepId: last.stepId,
      sessionId: session.id,
    },
  };
}

async function fallbackLegacy(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    conversation: Conversation;
    msg: ParsedInboundMessage;
    aiSettings: AiSettings;
    automations: Automations | null;
  }
): Promise<PipelineResult> {
  const resolvedReply = await resolveAutoReply(supabase, {
    businessId: params.businessId,
    conversation: params.conversation,
    msg: params.msg,
    aiSettings: params.aiSettings,
    automations: params.automations,
  });
  return { handledBy: "legacy", resolvedReply };
}
