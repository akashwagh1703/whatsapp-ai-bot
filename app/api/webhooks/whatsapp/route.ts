import { after, NextResponse } from "next/server";
import {
  snapshotWebhookPayload,
  summarizeWebhookPayload,
  verifyWebhook,
} from "@/services/whatsapp.service";
import {
  getWhatsAppAppSecret,
  getWhatsAppVerifyToken,
  isWebhookSignatureEnforced,
  shouldAwaitWebhookProcessing,
  validateWhatsAppEnvForWebhook,
} from "@/lib/whatsapp-env";
import { verifyMetaWebhookSignature } from "@/lib/meta-webhook-signature";
import { processWhatsAppWebhook } from "@/services/whatsapp-webhook.handler";
import { createServiceClient } from "@/lib/supabase/server";
import { logWebhookEvent } from "@/lib/webhook-log";
import { webhookLog, webhookWarn, webhookError } from "@/lib/webhook-debug";

/** AI + WhatsApp send can take 15–30s; extended on Vercel via after(). */
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  webhookLog("verify_request", { mode, hasChallenge: !!challenge });

  const result = verifyWebhook(
    mode,
    token,
    challenge,
    getWhatsAppVerifyToken()
  );
  if (result) {
    webhookLog("verify_success");
    return new NextResponse(result, { status: 200 });
  }
  webhookWarn("verify_failed");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function runWebhookPipeline(
  body: unknown,
  summary: ReturnType<typeof summarizeWebhookPayload>
) {
  const result = await processWhatsAppWebhook(body);

  try {
    const supabase = await createServiceClient();
    await logWebhookEvent(supabase, {
      fields: summary.fields,
      messagesCount: summary.messageCount,
      phoneNumberId: summary.phoneNumberId,
      result,
    });
  } catch (e) {
    webhookWarn("webhook_event_log_failed", {
      error: e instanceof Error ? e.message : "unknown",
    });
  }

  if (result.warning === "no_messages_in_payload") {
    webhookWarn("post_no_messages", { ...summary });
  }
  if (result.warning === "status_only_payload") {
    webhookWarn("post_status_only", { statusCount: summary.statusCount });
  }
  if (result.warning === "no_business") {
    webhookError("post_no_business", new Error("no_business"));
  }

  const first = result.results[0];
  webhookLog("post_pipeline_done", {
    ok: result.ok,
    messagesParsed: result.messagesParsed,
    replySent: first?.replySent ?? false,
    replySource: first?.replySource,
    skippedReason: first?.skippedReason,
    sendError: first?.error,
  });

  return result;
}

function buildResponse(
  result: Awaited<ReturnType<typeof processWhatsAppWebhook>>,
  summary: ReturnType<typeof summarizeWebhookPayload>,
  acceptedOnly = false
) {
  const first = result.results[0];
  const envCheck = result.envValidation ?? validateWhatsAppEnvForWebhook();

  if (acceptedOnly) {
    return NextResponse.json({
      status: "accepted",
      messagesQueued: summary.messageCount,
      metaFields: summary.fields,
      phoneNumberIdFromMeta: summary.phoneNumberId,
      envIssues: envCheck.valid ? undefined : envCheck.issues,
      hint: "Processing continues in background. Check Vercel logs for [whatsapp-webhook] and Webhook test → Recent calls.",
    });
  }

  return NextResponse.json({
    ok: result.ok,
    warning: result.warning,
    error: result.error,
    messagesParsed: result.messagesParsed,
    metaFields: summary.fields,
    statusCount: summary.statusCount,
    phoneNumberIdFromMeta: summary.phoneNumberId,
    displayPhoneFromMeta: summary.displayPhoneNumber,
    phoneMismatch: result.phoneMismatch ?? false,
    replySent: first?.replySent ?? false,
    replySaved: first?.replySaved ?? false,
    replySource: first?.replySource,
    whatsAppMessageId: first?.whatsAppMessageId,
    skippedReason: first?.skippedReason,
    sendError: first?.error,
    env: result.env,
    envIssues: envCheck.valid ? undefined : envCheck.issues,
    openRouterModel: result.env.openRouterModel,
    openRouterKeyOk: result.env.hasOpenRouter,
    results: result.results,
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  webhookLog("post_hit", { requestId });

  const rawBody = await request.text();
  const appSecret = getWhatsAppAppSecret();

  if (isWebhookSignatureEnforced()) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
      webhookWarn("signature_rejected", { requestId });
      try {
        const supabase = await createServiceClient();
        await logWebhookEvent(supabase, {
          fields: "signature_rejected",
          messagesCount: 0,
          phoneNumberId: null,
          result: {
            ok: false,
            messagesParsed: 0,
            warning: "invalid_signature",
            results: [],
            env: {
              hasPhoneId: false,
              hasWaToken: false,
              hasOpenRouter: false,
              openRouterModel: "",
              hasServiceRole: true,
              aiEnabled: false,
            },
          },
        });
      } catch {
        // ignore
      }
      return NextResponse.json(
        {
          error: "Invalid signature",
          hint: "WHATSAPP_APP_SECRET must match Meta App Secret. Internal webhook tests skip this check.",
        },
        { status: 401 }
      );
    }
    webhookLog("signature_ok", { requestId });
  } else {
    webhookWarn("signature_skipped", {
      requestId,
      reason: "WHATSAPP_APP_SECRET not set",
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    webhookWarn("invalid_json", { requestId });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const summary = summarizeWebhookPayload(body);
  webhookLog("incoming_payload", {
    requestId,
    ...snapshotWebhookPayload(body),
  });

  const syncHeader = request.headers.get("x-webhook-sync") === "1";
  const awaitProcessing = shouldAwaitWebhookProcessing() || syncHeader;

  if (awaitProcessing) {
    webhookLog("processing_sync", { requestId });
    const result = await runWebhookPipeline(body, summary);
    return buildResponse(result, summary, false);
  }

  webhookLog("processing_async", { requestId });
  after(async () => {
    try {
      await runWebhookPipeline(body, summary);
    } catch (e) {
      webhookError("background_pipeline_failed", e, { requestId });
    }
  });

  return buildResponse(
    {
      ok: true,
      messagesParsed: summary.messageCount,
      warning: summary.messageCount === 0 ? "no_messages_in_payload" : undefined,
      results: [],
      env: {
        hasPhoneId: !!process.env.WHATSAPP_PHONE_ID,
        hasWaToken: !!process.env.WHATSAPP_TOKEN,
        hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
        openRouterModel: process.env.OPENROUTER_DEFAULT_MODEL ?? "",
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        aiEnabled: false,
      },
    },
    summary,
    true
  );
}
