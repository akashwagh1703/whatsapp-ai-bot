import type { WebhookProcessResult } from "@/services/whatsapp-webhook.handler";

export interface WebhookTestInterpretation {
  correctImplementation: boolean;
  inboundSimulated: string;
  outboundSent: string | null;
  replySource: string;
  replySent: boolean;
  aiFailed: boolean;
  aiError: string | null;
  summary: string;
  whatToDo: string[];
}

/** Plain-language explanation of an internal webhook simulate result. */
export function interpretWebhookTestResult(
  inboundText: string,
  result: WebhookProcessResult
): WebhookTestInterpretation {
  const first = result.results[0];
  const replySource = first?.replySource ?? "none";
  const outbound = first?.replyPreview ?? null;
  const aiFailed = replySource === "fallback";
  const aiError = first?.error ?? null;

  const whatToDo: string[] = [];

  if (result.warning === "no_messages_in_payload") {
    return {
      correctImplementation: false,
      inboundSimulated: inboundText,
      outboundSent: null,
      replySource: "none",
      replySent: false,
      aiFailed: false,
      aiError: null,
      summary: "Payload had no messages — parser found nothing to process.",
      whatToDo: ["Check simulate payload format in server logs."],
    };
  }

  if (!first) {
    return {
      correctImplementation: false,
      inboundSimulated: inboundText,
      outboundSent: null,
      replySource: "none",
      replySent: false,
      aiFailed: false,
      aiError: null,
      summary: "Handler ran but produced no per-message result.",
      whatToDo: ["Check server logs for [whatsapp-webhook]."],
    };
  }

  if (replySource === "fallback" || aiFailed) {
    whatToDo.push(
      "OpenRouter AI failed (often 429 rate limit on free models).",
      "Set OPENROUTER_DEFAULT_MODEL=minimax/minimax-m2.5:free in env.",
      "AI Bot → Activate chatbot → Test chatbot on /ai-bot.",
      "The text you typed is only the simulated customer message — it is not echoed back."
    );
  } else if (replySource === "ai") {
    whatToDo.push("Working as expected — AI generated the WhatsApp reply.");
  } else if (replySource === "away") {
    whatToDo.push(
      "Away message is ON in Automations — it overrides AI. Turn off Away to test AI."
    );
  } else if (replySource === "welcome") {
    whatToDo.push(
      "Welcome message sent (first message in conversation). Disable welcome to test AI on every message."
    );
  } else if (replySource === "keyword") {
    whatToDo.push("A keyword automation rule matched and sent its fixed reply.");
  } else if (replySource === "handoff") {
    whatToDo.push("Human handoff rule matched (e.g. word 'human' in message).");
  } else if (replySource === "env_fallback") {
    whatToDo.push("AI skipped; WHATSAPP_FALLBACK_REPLY env text was sent.");
  } else if (replySource === "duplicate") {
    whatToDo.push("Duplicate test ID — change phone or run again (new wamid.test.* id is auto-generated).");
  } else if (!first.replySent && first.skippedReason) {
    whatToDo.push(first.skippedReason);
    whatToDo.push("Enable AI Bot, set OPENROUTER_API_KEY, turn off Away message.");
  }

  let summary: string;

  if (aiFailed) {
    summary =
      "Webhook test is implemented correctly. Your text was saved as the customer's inbound message. " +
      "The reply on WhatsApp is NOT your test text — it is the AI error fallback because OpenRouter failed.";
  } else if (replySource === "ai") {
    summary =
      "Webhook test is correct. Inbound message simulated; AI auto-reply was generated and sent.";
  } else if (outbound) {
    summary = `Webhook test is correct. Inbound simulated; outbound reply type: ${replySource}.`;
  } else {
    summary =
      "Webhook test ran but no WhatsApp reply was sent. See skippedReason in JSON below.";
  }

  return {
    correctImplementation: true,
    inboundSimulated: inboundText,
    outboundSent: outbound,
    replySource,
    replySent: !!first.replySent,
    aiFailed,
    aiError,
    summary,
    whatToDo,
  };
}
