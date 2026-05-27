/**
 * Flow engine — executes database-driven workflows (no hardcoded replies).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFirstStepId } from "@/modules/flows/flow-repository";
import { routeInboundMessage } from "@/modules/router/message-router";
import {
  startSession,
  updateSession,
} from "@/modules/sessions/session-manager";
import { collectRepliesForTransition } from "@/services/flow-engine/flow-executor";
import { ensureDefaultFlows, syncRuleFlows } from "@/services/flow-engine/flow-seed.service";
import { fromFlowExecution } from "@/services/response-generator";
import type { GeneratedResponse } from "@/services/response-generator";
import { webhookLog, webhookWarn } from "@/lib/webhook-debug";
import type { Automations } from "@/types";

export async function runFlowEngine(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    conversationId: string;
    contactId: string;
    messageText: string | null;
    automations: Automations | null;
  }
): Promise<GeneratedResponse | null> {
  await ensureDefaultFlows(supabase, params.businessId);
  await syncRuleFlows(supabase, params.businessId, params.automations);

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", params.conversationId);

  const isFirstMessage = (count ?? 0) <= 1;

  const route = await routeInboundMessage(supabase, {
    businessId: params.businessId,
    conversationId: params.conversationId,
    messageText: params.messageText,
    isFirstMessage,
  });

  if (route.action === "legacy") {
    return null;
  }

  const flow = route.flow;
  let session =
    route.action === "continue_flow" ? route.session : null;

  if (route.action === "start_flow") {
    const firstStepId = getFirstStepId(flow);
    if (!firstStepId) {
      webhookWarn("flow_empty", { flowSlug: flow.slug });
      return null;
    }
    session = await startSession(supabase, {
      businessId: params.businessId,
      conversationId: params.conversationId,
      contactId: params.contactId,
      flowId: flow.id,
      firstStepId,
      flowSlug: flow.slug,
    });
  }

  if (!session) return null;

  const execResults = collectRepliesForTransition({
    flow,
    startStepId: session.current_step_id,
    userMessage: params.messageText,
    session,
  });

  const last = execResults[execResults.length - 1];
  if (!last) return null;

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

  webhookLog("flow_engine_complete", {
    flowSlug: flow.slug,
    stepId: last.stepId,
  });

  return fromFlowExecution(execResults, {
    flowSlug: flow.slug,
    sessionId: session.id,
  });
}
