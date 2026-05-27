import type { SupabaseClient } from "@supabase/supabase-js";
import type { FlowDefinition, FlowRecord } from "@/types/flow";

function mapFlow(row: Record<string, unknown>): FlowRecord {
  return {
    id: row.id as string,
    business_id: row.business_id as string,
    slug: row.slug as string,
    name: row.name as string,
    enabled: !!row.enabled,
    priority: (row.priority as number) ?? 100,
    triggers: (row.triggers as string[]) ?? [],
    definition: (row.definition as FlowDefinition) ?? { steps: [] },
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

export async function listFlowsForBusiness(
  supabase: SupabaseClient,
  businessId: string
): Promise<FlowRecord[]> {
  const { data, error } = await supabase
    .from("flows")
    .select("*")
    .eq("business_id", businessId)
    .order("priority", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => mapFlow(r as Record<string, unknown>));
}

export async function getFlowBySlug(
  supabase: SupabaseClient,
  businessId: string,
  slug: string
): Promise<FlowRecord | null> {
  const { data, error } = await supabase
    .from("flows")
    .select("*")
    .eq("business_id", businessId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data ? mapFlow(data as Record<string, unknown>) : null;
}

export async function getFlowById(
  supabase: SupabaseClient,
  flowId: string
): Promise<FlowRecord | null> {
  const { data, error } = await supabase
    .from("flows")
    .select("*")
    .eq("id", flowId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapFlow(data as Record<string, unknown>) : null;
}

export async function findFlowByTrigger(
  supabase: SupabaseClient,
  businessId: string,
  message: string
): Promise<FlowRecord | null> {
  const flows = await listFlowsForBusiness(supabase, businessId);
  const lower = message.trim().toLowerCase();
  if (!lower) return null;

  for (const flow of flows) {
    if (!flow.enabled) continue;
    for (const trigger of flow.triggers) {
      const t = trigger.trim().toLowerCase();
      if (!t) continue;
      if (t === "*" || t === "any") return flow;
      if (lower === t || lower.includes(t)) return flow;
    }
  }

  return null;
}

export async function upsertFlow(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    slug: string;
    name: string;
    triggers: string[];
    definition: FlowDefinition;
    enabled?: boolean;
    priority?: number;
  }
): Promise<FlowRecord> {
  const { data, error } = await supabase
    .from("flows")
    .upsert(
      {
        business_id: params.businessId,
        slug: params.slug,
        name: params.name,
        triggers: params.triggers,
        definition: params.definition,
        enabled: params.enabled ?? true,
        priority: params.priority ?? 100,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id,slug" }
    )
    .select()
    .single();

  if (error) throw error;
  return mapFlow(data as Record<string, unknown>);
}

export function getStepById(
  flow: FlowRecord,
  stepId: string
) {
  return flow.definition.steps.find((s) => s.id === stepId) ?? null;
}

export function getFirstStepId(flow: FlowRecord): string | null {
  return flow.definition.steps[0]?.id ?? null;
}
