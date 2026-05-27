/**
 * Inbound pipeline (Meta → store → router → auto-reply → send).
 *
 * User Message → Meta → Webhook → Validator → Message Store → Message Router
 * → Session Manager → Auto Reply Engine → Flow/Rule Engine → Response Generator
 * → WhatsApp Send → User
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { ensureAiSettings } from "@/lib/business";
import {
  webhookLog,
  webhookWarn,
  webhookError,
  maskPhone,
  toLogData,
} from "@/lib/webhook-debug";
import { getOpenRouterConfig, logOpenRouterEnv } from "@/lib/openrouter-env";
import {
  getWhatsAppAccessToken,
  getWhatsAppPhoneId,
  validateWhatsAppEnvForWebhook,
} from "@/lib/whatsapp-env";
import { resolveWebhookBusinessId } from "@/lib/resolve-webhook-business";
import { parseIncomingWebhook, summarizeWebhookPayload } from "@/modules/webhook/message-parser";
import {
  messageExistsByWaId,
  storeInboundMessage,
  storeOutboundMessage,
} from "@/modules/messages/message-store";
import { sendReplyToUser } from "@/modules/whatsapp/whatsapp-sender";
import { runAutoReplyEngine } from "@/services/auto-reply-engine";
import type { GeneratedResponse } from "@/services/response-generator";
import { fetchWhatsAppMediaUrl, snapshotWebhookPayload } from "@/services/whatsapp.service";
import { dispatchIntegrationWebhook } from "@/services/webhook-dispatch.service";
import type { AutoReplySource } from "@/types/whatsapp-webhook";
import type { Conversation } from "@/types";
import type {
  WebhookMessageResult,
  WebhookProcessResult,
} from "@/types/webhook-process";

export type { WebhookMessageResult, WebhookProcessResult };

function mapReplySource(response: GeneratedResponse): AutoReplySource {
  if (response.handoff) return "handoff";
  if (response.source === "flow") return "flow";
  if (response.source === "ai") return "ai";
  return "fallback";
}

async function deliverGeneratedResponse(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    conversationId: string;
    to: string;
    response: GeneratedResponse;
    phoneId: string;
    token: string;
  }
): Promise<import("@/modules/whatsapp/whatsapp-sender").SendReplyResult> {
  await storeOutboundMessage(supabase, {
    businessId: params.businessId,
    conversationId: params.conversationId,
    text: params.response.text,
    isAi: params.response.isAi,
  });

  return sendReplyToUser({
    phoneId: params.phoneId,
    token: params.token,
    to: params.to,
    text: params.response.text,
  });
}

export async function processInboundWebhook(
  body: unknown
): Promise<WebhookProcessResult> {
  webhookLog("process_start", snapshotWebhookPayload(body));

  const envCheck = validateWhatsAppEnvForWebhook();
  const incoming = parseIncomingWebhook(body);

  const openRouterCfg = getOpenRouterConfig();
  const env = {
    hasPhoneId: !!getWhatsAppPhoneId(),
    hasWaToken: !!getWhatsAppAccessToken(),
    hasOpenRouter: openRouterCfg.keyConfigured,
    openRouterModel: openRouterCfg.model,
    hasServiceRole: envCheck.hasServiceRole,
    aiEnabled: false,
  };

  if (!envCheck.valid) {
    webhookWarn("env_validation_failed", { issues: envCheck.issues });
  }

  if (incoming.length > 0) {
    logOpenRouterEnv("webhook inbound");
  }

  if (!incoming.length) {
    const summary = summarizeWebhookPayload(body);
    webhookWarn("no_inbound_messages", toLogData(summary));
    return {
      ok: true,
      messagesParsed: 0,
      warning:
        summary.statusCount > 0
          ? "status_only_payload"
          : "no_messages_in_payload",
      results: [],
      env,
      envValidation: { valid: envCheck.valid, issues: envCheck.issues },
    };
  }

  let supabase: SupabaseClient;
  try {
    supabase = await createServiceClient();
  } catch (e) {
    webhookError("supabase_client_failed", e);
    return {
      ok: false,
      messagesParsed: incoming.length,
      error:
        e instanceof Error
          ? e.message
          : "Supabase service client failed — check SUPABASE_SERVICE_ROLE_KEY",
      results: [],
      env,
      envValidation: { valid: envCheck.valid, issues: envCheck.issues },
    };
  }

  const metaSummary = summarizeWebhookPayload(body);
  const resolved = await resolveWebhookBusinessId(
    supabase,
    metaSummary.phoneNumberId
  );

  if (!resolved.businessId) {
    webhookError("no_business", new Error("no_business"), {
      metaPhoneId: metaSummary.phoneNumberId,
    });
    return {
      ok: false,
      messagesParsed: incoming.length,
      warning: "no_business",
      results: [],
      env,
      envValidation: { valid: envCheck.valid, issues: envCheck.issues },
    };
  }

  const businessId = resolved.businessId;
  webhookLog("business_resolved", {
    businessId,
    metaPhoneId: metaSummary.phoneNumberId,
  });

  let aiSettings;
  try {
    aiSettings = await ensureAiSettings(supabase, businessId);
  } catch (e) {
    webhookError("ai_settings_failed", e);
    return {
      ok: false,
      messagesParsed: incoming.length,
      error: e instanceof Error ? e.message : "Failed to load AI settings",
      results: [],
      env,
    };
  }

  env.aiEnabled = !!aiSettings.enabled;

  const { data: automations } = await supabase
    .from("automations")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  const { data: integrations } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  const envPhoneId = getWhatsAppPhoneId();
  const metaPhoneId = metaSummary.phoneNumberId;
  const token = getWhatsAppAccessToken();

  let effectivePhoneId = metaPhoneId || envPhoneId;
  const phoneMismatch =
    !!metaPhoneId && !!envPhoneId && metaPhoneId !== envPhoneId;

  if (phoneMismatch && metaPhoneId) {
    webhookWarn("phone_id_sync", { meta: metaPhoneId, env: envPhoneId });
    effectivePhoneId = metaPhoneId;
    await supabase.from("app_settings").upsert({
      business_id: businessId,
      whatsapp_phone_id: metaPhoneId,
      updated_at: new Date().toISOString(),
    });
  }

  webhookLog("processing_messages", {
    count: incoming.length,
    effectivePhoneId,
    aiEnabled: env.aiEnabled,
  });

  const results: WebhookMessageResult[] = [];

  for (const msg of incoming) {
    webhookLog("inbound_message", {
      from: maskPhone(msg.from),
      type: msg.type,
      waMessageId: msg.waMessageId,
      contentLength: msg.content?.length ?? 0,
    });

    const item: WebhookMessageResult = {
      from: msg.from,
      contactName: msg.contactName,
      content: msg.content,
      replySent: false,
      replySaved: false,
      replySource: "none",
    };

    try {
      if (msg.waMessageId && (await messageExistsByWaId(supabase, msg.waMessageId))) {
        item.skippedReason = "duplicate_wa_message_id";
        item.replySource = "duplicate";
        webhookWarn("duplicate_message", { waMessageId: msg.waMessageId });
        results.push(item);
        continue;
      }

      let mediaUrl: string | null = null;
      if (msg.mediaId && token) {
        mediaUrl = await fetchWhatsAppMediaUrl(msg.mediaId, token);
      }

      const stored = await storeInboundMessage(supabase, {
        businessId,
        msg,
        mediaUrl,
      });
      item.conversationId = stored.conversationId;

      const { data: conversationRow } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", stored.conversationId)
        .single();

      const conversation = conversationRow as Conversation;

      if (stored.isNewContact) {
        await dispatchIntegrationWebhook(
          integrations?.webhook_url,
          integrations?.events as string[],
          "new_lead",
          {
            conversationId: stored.conversationId,
            from: msg.from,
            contactName: msg.contactName,
          }
        );
      }

      await dispatchIntegrationWebhook(
        integrations?.webhook_url,
        integrations?.events as string[],
        "new_message",
        { conversationId: stored.conversationId, from: msg.from }
      );

      const generated = await runAutoReplyEngine(supabase, {
        businessId,
        conversation,
        contactId: stored.contactId,
        msg,
        aiSettings,
        automations,
      });

      if (generated?.flowMeta) {
        webhookLog("flow_reply", generated.flowMeta);
      }

      if (generated?.handoff) {
        await supabase
          .from("conversations")
          .update({ ai_enabled: false, status: "handoff" })
          .eq("id", stored.conversationId);

        await supabase.from("notifications").insert({
          business_id: businessId,
          type: "handoff",
          title: "Human assistance requested",
          body: `${msg.contactName} needs a team member.`,
        });

        await dispatchIntegrationWebhook(
          integrations?.webhook_url,
          integrations?.events as string[],
          "ai_handoff",
          {
            conversationId: stored.conversationId,
            from: msg.from,
            contactName: msg.contactName,
          }
        );
      }

      if (generated?.text) {
        const delivery = await deliverGeneratedResponse(supabase, {
          businessId,
          conversationId: stored.conversationId,
          to: msg.from,
          response: generated,
          phoneId: effectivePhoneId,
          token,
        });
        item.replySaved = true;
        item.replyPreview = generated.text.slice(0, 200);
        item.replySource = mapReplySource(generated);
        item.replySent = delivery.sent;
        item.whatsAppMessageId = delivery.messageId;
        if (generated.aiError) item.error = generated.aiError;
        if (delivery.error) {
          item.error = delivery.error;
          webhookError("deliver_reply_failed", new Error(delivery.error), {
            from: maskPhone(msg.from),
            source: item.replySource,
          });
        } else {
          webhookLog("auto_reply_complete", {
            from: maskPhone(msg.from),
            source: item.replySource,
            sent: true,
          });
        }
      } else {
        item.skippedReason = "no_reply_generated";
        webhookWarn("auto_reply_skipped", {
          from: maskPhone(msg.from),
          reason: item.skippedReason,
        });
      }
    } catch (e) {
      item.error = e instanceof Error ? e.message : "Processing failed";
      webhookError("message_processing_error", e, {
        from: maskPhone(msg.from),
      });
    }

    results.push(item);
  }

  webhookLog("process_complete", {
    messagesParsed: incoming.length,
    results: results.map((r) => ({
      from: maskPhone(r.from),
      replySent: r.replySent,
      replySource: r.replySource,
      skippedReason: r.skippedReason,
      error: r.error,
    })),
  });

  return {
    ok: true,
    messagesParsed: incoming.length,
    businessId,
    phoneMismatch,
    envValidation: { valid: envCheck.valid, issues: envCheck.issues },
    results,
    env,
  };
}

/** @deprecated Use processInboundWebhook — kept for existing imports. */
export const processWhatsAppWebhook = processInboundWebhook;
