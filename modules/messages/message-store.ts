import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bumpAnalytics,
  messageExistsByWaId,
  saveMessage,
  upsertContactAndConversation,
} from "@/services/message.service";
import type { ParsedInboundMessage } from "@/types/whatsapp-webhook";

export interface StoredInboundMessage {
  conversationId: string;
  contactId: string;
  isNewConversation: boolean;
  isNewContact: boolean;
}

/** Persist contact, conversation, and inbound message row. */
export async function storeInboundMessage(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    msg: ParsedInboundMessage;
    mediaUrl?: string | null;
  }
): Promise<StoredInboundMessage> {
  const { conversation, isNewConversation, isNewContact, contact } =
    await upsertContactAndConversation(
      supabase,
      params.businessId,
      params.msg.from,
      params.msg.contactName
    );

  await saveMessage(supabase, {
    conversationId: conversation.id,
    direction: "inbound",
    content: params.msg.content,
    mediaType: params.msg.mediaType,
    mediaUrl: params.mediaUrl ?? null,
    waMessageId: params.msg.waMessageId,
  });

  if (isNewConversation) {
    await bumpAnalytics(supabase, params.businessId, "conversations");
  }
  if (isNewContact) {
    await bumpAnalytics(supabase, params.businessId, "leads");
  }

  return {
    conversationId: conversation.id as string,
    contactId: contact.id as string,
    isNewConversation,
    isNewContact,
  };
}

export async function storeOutboundMessage(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    conversationId: string;
    text: string;
    isAi: boolean;
  }
): Promise<void> {
  await saveMessage(supabase, {
    conversationId: params.conversationId,
    direction: "outbound",
    content: params.text,
    isAi: params.isAi,
  });
  await bumpAnalytics(
    supabase,
    params.businessId,
    params.isAi ? "ai_replies" : "human_replies"
  );
}

export { messageExistsByWaId };
