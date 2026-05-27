/**
 * Message router — routes inbound messages only (no business logic).
 * Detects active sessions, flow triggers, or delegates to legacy handler.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findFlowByTrigger,
  getFlowById,
  getFlowBySlug,
} from "@/modules/flows/flow-repository";
import { getActiveSession } from "@/modules/sessions/session-service";
import type { MessageRouteAction } from "@/types/flow";
import { webhookLog } from "@/lib/webhook-debug";

export interface RouteInboundParams {
  businessId: string;
  conversationId: string;
  messageText: string | null;
  /** First inbound in conversation — may start welcome rule flow. */
  isFirstMessage?: boolean;
}

export async function routeInboundMessage(
  supabase: SupabaseClient,
  params: RouteInboundParams
): Promise<MessageRouteAction> {
  const text = params.messageText?.trim() ?? "";

  const session = await getActiveSession(supabase, params.conversationId);
  if (session) {
    const flow = await getFlowById(supabase, session.flow_id);
    if (flow?.enabled) {
      webhookLog("router_continue_flow", {
        flowSlug: flow.slug,
        stepId: session.current_step_id,
      });
      return { action: "continue_flow", session, flow };
    }
    await supabase
      .from("flow_sessions")
      .update({ status: "cancelled" })
      .eq("id", session.id);
  }

  if (params.isFirstMessage) {
    const welcome = await getFlowBySlug(
      supabase,
      params.businessId,
      "rule_welcome"
    );
    if (welcome?.enabled) {
      webhookLog("router_start_flow", {
        flowSlug: welcome.slug,
        trigger: "first_message",
      });
      return { action: "start_flow", flow: welcome };
    }
  }

  if (text) {
    const flow = await findFlowByTrigger(supabase, params.businessId, text);
    if (flow) {
      webhookLog("router_start_flow", { flowSlug: flow.slug, trigger: text });
      return { action: "start_flow", flow };
    }
  }

  webhookLog("router_legacy", { reason: "no_active_session_or_trigger" });
  return { action: "legacy" };
}
