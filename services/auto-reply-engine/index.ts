/**
 * Auto Reply Engine
 * Message Router → Session Manager → Flow Engine → (optional) AI → Response Generator
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { runFlowEngine } from "@/services/auto-reply-engine/flow-runner";
import { tryAiReply } from "@/services/auto-reply-engine/ai-provider";
import {
  defaultFallback,
  type GeneratedResponse,
} from "@/services/response-generator";
import { getWhatsAppFallbackReply } from "@/lib/whatsapp-env";
import { webhookLog } from "@/lib/webhook-debug";
import type { AiSettings, Automations, Conversation } from "@/types";
import type { ParsedInboundMessage } from "@/types/whatsapp-webhook";

export async function runAutoReplyEngine(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    conversation: Conversation;
    contactId: string;
    msg: ParsedInboundMessage;
    aiSettings: AiSettings;
    automations: Automations | null;
  }
): Promise<GeneratedResponse | null> {
  if (!params.msg.content?.trim() && !params.msg.mediaType) {
    return null;
  }

  const flowResponse = await runFlowEngine(supabase, {
    businessId: params.businessId,
    conversationId: params.conversation.id,
    contactId: params.contactId,
    messageText: params.msg.content,
    automations: params.automations,
  });

  if (flowResponse) {
    webhookLog("auto_reply_source", { source: "flow" });
    return flowResponse;
  }

  if (params.conversation.ai_enabled && params.aiSettings.enabled) {
    const aiResponse = await tryAiReply(supabase, {
      conversationId: params.conversation.id,
      msg: params.msg,
      aiSettings: params.aiSettings,
    });
    if (aiResponse) {
      webhookLog("auto_reply_source", { source: aiResponse.source });
      return aiResponse;
    }
  }

  const envFallback = getWhatsAppFallbackReply();
  webhookLog("auto_reply_source", { source: "fallback" });
  return defaultFallback(envFallback || undefined);
}
