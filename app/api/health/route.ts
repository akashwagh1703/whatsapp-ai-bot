import { NextResponse } from "next/server";
import { isFlowEngineEnabled } from "@/config/flow-engine";
import { isOpenRouterEnvConfigured } from "@/lib/openrouter-env";
import { isWhatsAppEnvConfigured } from "@/lib/whatsapp-env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      whatsapp: isWhatsAppEnvConfigured(),
      openrouter: isOpenRouterEnvConfigured(),
      flowEngine: isFlowEngineEnabled(),
    },
  });
}
