import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_THANKS_FLOW,
  DEFAULT_WELCOME_FLOW,
} from "@/modules/flows/default-flows";
import { listFlowsForBusiness, upsertFlow } from "@/modules/flows/flow-repository";
import { webhookLog } from "@/lib/webhook-debug";

/** Seed default flows when business has none (safe to call repeatedly). */
export async function ensureDefaultFlows(
  supabase: SupabaseClient,
  businessId: string
): Promise<void> {
  const existing = await listFlowsForBusiness(supabase, businessId);
  if (existing.length > 0) return;

  webhookLog("flow_seed_defaults", { businessId });

  await upsertFlow(supabase, {
    businessId,
    slug: DEFAULT_WELCOME_FLOW.slug,
    name: DEFAULT_WELCOME_FLOW.name,
    triggers: DEFAULT_WELCOME_FLOW.triggers,
    definition: DEFAULT_WELCOME_FLOW.definition,
    priority: DEFAULT_WELCOME_FLOW.priority,
  });

  await upsertFlow(supabase, {
    businessId,
    slug: DEFAULT_THANKS_FLOW.slug,
    name: DEFAULT_THANKS_FLOW.name,
    triggers: DEFAULT_THANKS_FLOW.triggers,
    definition: DEFAULT_THANKS_FLOW.definition,
    priority: DEFAULT_THANKS_FLOW.priority,
    enabled: false,
  });
}
