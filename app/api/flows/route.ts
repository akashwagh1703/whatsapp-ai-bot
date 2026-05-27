import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateBusiness } from "@/lib/business";
import {
  listFlowsForBusiness,
  upsertFlow,
} from "@/modules/flows/flow-repository";
import { ensureDefaultFlows } from "@/services/flow-engine/flow-seed.service";
import type { FlowDefinition } from "@/types/flow";

const flowSchema = z.object({
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  triggers: z.array(z.string()).min(1),
  definition: z.object({
    steps: z.array(z.object({}).passthrough()),
    version: z.number().optional(),
  }),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const business = await getOrCreateBusiness(supabase, user.id);
  await ensureDefaultFlows(supabase, business.id as string);
  const flows = await listFlowsForBusiness(supabase, business.id as string);

  return NextResponse.json({ flows });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = flowSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid flow" }, { status: 400 });
  }

  const business = await getOrCreateBusiness(supabase, user.id);
  const flow = await upsertFlow(supabase, {
    businessId: business.id as string,
    slug: parsed.data.slug,
    name: parsed.data.name,
    triggers: parsed.data.triggers,
    definition: parsed.data.definition as unknown as FlowDefinition,
    enabled: parsed.data.enabled,
    priority: parsed.data.priority,
  });

  return NextResponse.json({ ok: true, flow });
}
