import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_THANKS_FLOW,
  DEFAULT_WELCOME_FLOW,
} from "@/modules/flows/default-flows";
import { listFlowsForBusiness, upsertFlow } from "@/modules/flows/flow-repository";
import { webhookLog } from "@/lib/webhook-debug";
import type { Automations } from "@/types";
import type { FlowDefinition } from "@/types/flow";

function endMessageFlow(text: string): FlowDefinition {
  return {
    version: 1,
    steps: [{ id: "reply", type: "end", text }],
  };
}

/** Seed default menu flows when business has none. */
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

/** Sync portal automations (away, welcome, keywords) into DB rule flows. */
export async function syncRuleFlows(
  supabase: SupabaseClient,
  businessId: string,
  automations: Automations | null
): Promise<void> {
  if (!automations) return;

  const awayText = automations.away_message?.trim() ?? "";
  await upsertFlow(supabase, {
    businessId,
    slug: "rule_away",
    name: "Away message",
    triggers: ["*"],
    priority: 0,
    enabled: !!automations.away_enabled && !!awayText,
    definition: endMessageFlow(awayText || "We are currently away."),
  });

  const welcomeText = automations.welcome_message?.trim() ?? "";
  await upsertFlow(supabase, {
    businessId,
    slug: "rule_welcome",
    name: "Welcome message",
    triggers: [],
    priority: 1,
    enabled: !!automations.welcome_enabled && !!welcomeText,
    definition: endMessageFlow(welcomeText || "Welcome!"),
  });

  const keywords = (automations.keyword_replies ?? []) as Array<{
    keyword: string;
    reply: string;
  }>;

  for (let i = 0; i < keywords.length; i++) {
    const entry = keywords[i];
    const keyword = entry.keyword?.trim() ?? "";
    const reply = entry.reply?.trim() ?? "";
    await upsertFlow(supabase, {
      businessId,
      slug: `rule_keyword_${i}`,
      name: `Keyword: ${keyword || i}`,
      triggers: keyword ? [keyword] : [],
      priority: 5 + i,
      enabled: !!(keyword && reply),
      definition: endMessageFlow(reply || "Thanks!"),
    });
  }
}
