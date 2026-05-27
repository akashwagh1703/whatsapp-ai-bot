import { createServiceClient } from "@/lib/supabase/server";
import { ensureAiSettings } from "@/lib/business";
import {
  webhookLog,
  webhookWarn,
  webhookError,
  maskPhone,
  toLogData,
} from "@/lib/webhook-debug";
import {
  getOpenRouterConfig,
  logOpenRouterEnv,
} from "@/lib/openrouter-env";
import {
  getWhatsAppAccessToken,
  getWhatsAppPhoneId,
  validateWhatsAppEnvForWebhook,
} from "@/lib/whatsapp-env";
import { resolveWebhookBusinessId } from "@/lib/resolve-webhook-business";
import { processMessagePipeline } from "@/services/flow-engine/message-pipeline";
import {
  bumpAnalytics,
  messageExistsByWaId,
  saveMessage,
  upsertContactAndConversation,
} from "@/services/message.service";
import { dispatchIntegrationWebhook } from "@/services/webhook-dispatch.service";
import {
  fetchWhatsAppMediaUrl,
  parseIncomingWebhook,
  sendWhatsAppMessage,
  snapshotWebhookPayload,
  summarizeWebhookPayload,
} from "@/services/whatsapp.service";
import type { AutoReplySource } from "@/types/whatsapp-webhook";
import type { Conversation } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WebhookMessageResult {
  from: string;
  contactName: string;
  content: string | null;
  conversationId?: string;
  replySent: boolean;
  replySaved: boolean;
  replyPreview?: string;
  replySource?: AutoReplySource | "duplicate";
  skippedReason?: string;
  error?: string;
  whatsAppMessageId?: string;
}

export interface WebhookProcessResult {
  ok: boolean;
  messagesParsed: number;
  warning?: string;
  error?: string;
  businessId?: string;
  phoneMismatch?: boolean;
  envValidation?: { valid: boolean; issues: string[] };
  results: WebhookMessageResult[];
  env: {
    hasPhoneId: boolean;
    hasWaToken: boolean;
    hasOpenRouter: boolean;
    openRouterModel: string;
    hasServiceRole: boolean;
    aiEnabled: boolean;
  };
}

async function deliverReply(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    conversationId: string;
    to: string;
    replyText: string;
    replySource: AutoReplySource;
    phoneId: string;
    token: string;
    isAi: boolean;
  }
): Promise<{ sent: boolean; error?: string; whatsAppMessageId?: string }> {
  await saveMessage(supabase, {
    conversationId: params.conversationId,
    direction: "outbound",
    content: params.replyText,
    isAi: params.isAi,
  });

  await bumpAnalytics(
    supabase,
    params.businessId,
    params.isAi ? "ai_replies" : "human_replies"
  );

  const sendResult = await sendWhatsAppMessage({
    phoneId: params.phoneId,
    token: params.token,
    to: params.to,
    text: params.replyText,
  });

  if (!sendResult.ok) {
    return { sent: false, error: sendResult.error };
  }

  return {
    sent: true,
    whatsAppMessageId: sendResult.messageId,
  };
}

export async function processWhatsAppWebhook(
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

  let supabase;
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
  webhookLog("business_resolved", { businessId, metaPhoneId: metaSummary.phoneNumberId });

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

      const { conversation, isNewConversation, isNewContact } =
        await upsertContactAndConversation(
          supabase,
          businessId,
          msg.from,
          msg.contactName
        );
      item.conversationId = conversation.id;

      let mediaUrl: string | null = null;
      if (msg.mediaId && token) {
        mediaUrl = await fetchWhatsAppMediaUrl(msg.mediaId, token);
      }

      await saveMessage(supabase, {
        conversationId: conversation.id,
        direction: "inbound",
        content: msg.content,
        mediaType: msg.mediaType,
        mediaUrl,
        waMessageId: msg.waMessageId,
      });

      if (isNewConversation) {
        await bumpAnalytics(supabase, businessId, "conversations");
      }
      if (isNewContact) {
        await bumpAnalytics(supabase, businessId, "leads");
        await dispatchIntegrationWebhook(
          integrations?.webhook_url,
          integrations?.events as string[],
          "new_lead",
          {
            conversationId: conversation.id,
            from: msg.from,
            contactName: msg.contactName,
          }
        );
      }

      await dispatchIntegrationWebhook(
        integrations?.webhook_url,
        integrations?.events as string[],
        "new_message",
        { conversationId: conversation.id, from: msg.from }
      );

      const contactId = (conversation as Conversation & { contact_id?: string })
        .contact_id;
      const pipeline = await processMessagePipeline(supabase, {
        businessId,
        conversation: conversation as Conversation,
        contactId: contactId ?? "",
        msg,
        aiSettings,
        automations,
      });
      const resolvedReply = pipeline.resolvedReply;

      if (pipeline.flowMeta) {
        webhookLog("flow_reply", pipeline.flowMeta);
      }

      if (resolvedReply.source === "handoff") {
        await supabase
          .from("conversations")
          .update({ ai_enabled: false, status: "handoff" })
          .eq("id", conversation.id);

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
            conversationId: conversation.id,
            from: msg.from,
            contactName: msg.contactName,
          }
        );
      }

      if (resolvedReply.text) {
        const delivery = await deliverReply(supabase, {
          businessId,
          conversationId: conversation.id,
          to: msg.from,
          replyText: resolvedReply.text,
          replySource: resolvedReply.source,
          phoneId: effectivePhoneId,
          token,
          isAi: resolvedReply.isAi,
        });
        item.replySaved = true;
        item.replyPreview = resolvedReply.text.slice(0, 200);
        item.replySource = resolvedReply.source;
        item.replySent = delivery.sent;
        item.whatsAppMessageId = delivery.whatsAppMessageId;
        if (resolvedReply.aiError) item.error = resolvedReply.aiError;
        if (delivery.error) {
          item.error = delivery.error;
          webhookError("deliver_reply_failed", new Error(delivery.error), {
            from: maskPhone(msg.from),
            source: resolvedReply.source,
          });
        } else {
          webhookLog("auto_reply_complete", {
            from: maskPhone(msg.from),
            source: resolvedReply.source,
            sent: true,
          });
        }
      } else {
        item.skippedReason = resolvedReply.skippedReason;
        webhookWarn("auto_reply_skipped", {
          from: maskPhone(msg.from),
          reason: resolvedReply.skippedReason,
        });
      }
    } catch (e) {
      item.error = e instanceof Error ? e.message : "Processing failed";
      webhookError("message_processing_error", e, { from: maskPhone(msg.from) });
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
