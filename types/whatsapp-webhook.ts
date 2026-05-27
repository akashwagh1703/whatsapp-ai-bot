/** Parsed inbound WhatsApp Cloud API webhook message. */
export interface ParsedInboundMessage {
  from: string;
  waMessageId: string;
  type: string;
  content: string | null;
  mediaType: string | null;
  mediaId: string | null;
  contactName: string;
  timestamp?: string;
}

export interface WebhookPayloadSummary {
  fields: string;
  messageCount: number;
  statusCount: number;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
}

export type AutoReplySource =
  | "keyword"
  | "welcome"
  | "away"
  | "ai"
  | "fallback"
  | "handoff"
  | "env_fallback"
  | "flow"
  | "none";

export interface ResolvedAutoReply {
  text: string | null;
  source: AutoReplySource;
  isAi: boolean;
  skippedReason?: string;
  aiError?: string;
}
