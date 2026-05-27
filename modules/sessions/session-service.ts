import type { SupabaseClient } from "@supabase/supabase-js";
import { getFlowSessionTtlHours } from "@/config/flow-engine";
import type {
  FlowSessionContext,
  FlowSessionRecord,
  FlowSessionStatus,
} from "@/types/flow";

function mapSession(row: Record<string, unknown>): FlowSessionRecord {
  const ctx = (row.context as FlowSessionContext) ?? {};
  return {
    id: row.id as string,
    business_id: row.business_id as string,
    conversation_id: row.conversation_id as string,
    contact_id: row.contact_id as string,
    flow_id: row.flow_id as string,
    current_step_id: row.current_step_id as string,
    status: row.status as FlowSessionStatus,
    context: {
      data: ctx.data ?? {},
      awaiting: ctx.awaiting ?? null,
      flowSlug: ctx.flowSlug,
    },
    last_interaction_at: row.last_interaction_at as string,
  };
}

export async function getActiveSession(
  supabase: SupabaseClient,
  conversationId: string
): Promise<FlowSessionRecord | null> {
  const { data, error } = await supabase
    .from("flow_sessions")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const session = mapSession(data as Record<string, unknown>);
  if (isSessionExpired(session)) {
    await updateSessionStatus(supabase, session.id, "expired");
    return null;
  }

  return session;
}

function isSessionExpired(session: FlowSessionRecord): boolean {
  const ttlMs = getFlowSessionTtlHours() * 60 * 60 * 1000;
  const last = new Date(session.last_interaction_at).getTime();
  return Date.now() - last > ttlMs;
}

export async function startSession(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    conversationId: string;
    contactId: string;
    flowId: string;
    firstStepId: string;
    flowSlug: string;
  }
): Promise<FlowSessionRecord> {
  await supabase
    .from("flow_sessions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("conversation_id", params.conversationId)
    .eq("status", "active");

  const context: FlowSessionContext = {
    data: {},
    awaiting: null,
    flowSlug: params.flowSlug,
  };

  const { data, error } = await supabase
    .from("flow_sessions")
    .insert({
      business_id: params.businessId,
      conversation_id: params.conversationId,
      contact_id: params.contactId,
      flow_id: params.flowId,
      current_step_id: params.firstStepId,
      status: "active",
      context,
    })
    .select()
    .single();

  if (error) throw error;
  return mapSession(data as Record<string, unknown>);
}

export async function updateSession(
  supabase: SupabaseClient,
  sessionId: string,
  patch: {
    currentStepId?: string;
    status?: FlowSessionStatus;
    context?: FlowSessionContext;
  }
): Promise<void> {
  const updates: Record<string, unknown> = {
    last_interaction_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (patch.currentStepId) updates.current_step_id = patch.currentStepId;
  if (patch.status) updates.status = patch.status;
  if (patch.context) updates.context = patch.context;

  const { error } = await supabase
    .from("flow_sessions")
    .update(updates)
    .eq("id", sessionId);

  if (error) throw error;
}

export async function updateSessionStatus(
  supabase: SupabaseClient,
  sessionId: string,
  status: FlowSessionStatus
): Promise<void> {
  await updateSession(supabase, sessionId, { status });
}
