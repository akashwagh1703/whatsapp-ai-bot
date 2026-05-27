import type { AutoReplySource } from "@/types/whatsapp-webhook";

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
