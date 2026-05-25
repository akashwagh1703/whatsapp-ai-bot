import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageDirection } from "@/types";

export async function upsertContactAndConversation(
  supabase: SupabaseClient,
  businessId: string,
  phone: string,
  contactName: string
) {
  const { data: contact } = await supabase
    .from("contacts")
    .upsert(
      {
        business_id: businessId,
        phone,
        name: contactName,
        last_interaction_at: new Date().toISOString(),
      },
      { onConflict: "business_id,phone" }
    )
    .select()
    .single();

  if (!contact) {
    throw new Error("Failed to upsert contact");
  }

  const { data: existingConversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("contact_id", contact.id)
    .maybeSingle();

  const isNewConversation = !existingConversation;

  const { data: conversation } = await supabase
    .from("conversations")
    .upsert(
      {
        business_id: businessId,
        contact_id: contact.id,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "business_id,contact_id" }
    )
    .select("*, contact:contacts(*)")
    .single();

  if (!conversation) {
    throw new Error("Failed to upsert conversation");
  }

  return { contact, conversation, isNewConversation };
}

export async function saveMessage(
  supabase: SupabaseClient,
  params: {
    conversationId: string;
    direction: MessageDirection;
    content: string | null;
    mediaType?: string | null;
    isAi?: boolean;
    waMessageId?: string;
  }
) {
  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      direction: params.direction,
      content: params.content,
      media_type: params.mediaType ?? null,
      is_ai: params.isAi ?? false,
      wa_message_id: params.waMessageId ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("conversations")
    .update({
      last_message: params.content,
      last_message_at: new Date().toISOString(),
      unread_count:
        params.direction === "inbound"
          ? undefined
          : 0,
    })
    .eq("id", params.conversationId);

  if (params.direction === "inbound") {
    const { data: conv } = await supabase
      .from("conversations")
      .select("unread_count")
      .eq("id", params.conversationId)
      .single();
    await supabase
      .from("conversations")
      .update({
        unread_count: (conv?.unread_count ?? 0) + 1,
        last_message: params.content,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", params.conversationId);
  }

  return message;
}

export async function bumpAnalytics(
  supabase: SupabaseClient,
  businessId: string,
  field: "conversations" | "ai_replies" | "human_replies" | "leads",
  amount = 1
) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: row } = await supabase
    .from("analytics_daily")
    .select("*")
    .eq("business_id", businessId)
    .eq("date", today)
    .maybeSingle();

  const base = {
    business_id: businessId,
    date: today,
    conversations: row?.conversations ?? 0,
    ai_replies: row?.ai_replies ?? 0,
    human_replies: row?.human_replies ?? 0,
    leads: row?.leads ?? 0,
  };
  base[field] += amount;

  await supabase.from("analytics_daily").upsert(base, {
    onConflict: "business_id,date",
  });
}
