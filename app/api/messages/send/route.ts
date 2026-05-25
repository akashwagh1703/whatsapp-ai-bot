import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateBusiness } from "@/lib/business";
import { rateLimit } from "@/lib/rate-limit";
import { saveMessage, bumpAnalytics } from "@/services/message.service";
import { sendWhatsAppText } from "@/services/whatsapp.service";
import {
  getWhatsAppAccessToken,
  getWhatsAppPhoneId,
} from "@/lib/whatsapp-env";

const schema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4096),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limit = rateLimit(`msg:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const business = await getOrCreateBusiness(supabase, user.id);

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, contact:contacts(*)")
    .eq("id", body.data.conversationId)
    .eq("business_id", business.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const phoneId = getWhatsAppPhoneId();
  const token = getWhatsAppAccessToken();

  let whatsappSent = false;
  let whatsappError: string | null = null;

  if (!phoneId || !token) {
    whatsappError =
      "WhatsApp not configured — set WHATSAPP_PHONE_ID and WHATSAPP_TOKEN in env.";
  } else if (!conversation.contact?.phone) {
    whatsappError = "Contact phone number missing.";
  } else {
    try {
      await sendWhatsAppText({
        phoneId,
        token,
        to: conversation.contact.phone,
        text: body.data.content,
      });
      whatsappSent = true;
    } catch (e) {
      whatsappError =
        e instanceof Error ? e.message : "WhatsApp send failed";
      console.error("[messages/send]", whatsappError);
    }
  }

  if (!whatsappSent) {
    return NextResponse.json(
      {
        ok: false,
        whatsappSent: false,
        error: whatsappError ?? "Message was not sent to WhatsApp",
      },
      { status: 502 }
    );
  }

  await saveMessage(supabase, {
    conversationId: body.data.conversationId,
    direction: "outbound",
    content: body.data.content,
    isAi: false,
  });

  await supabase
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", body.data.conversationId);

  await bumpAnalytics(supabase, business.id, "human_replies");

  return NextResponse.json({ ok: true, whatsappSent: true });
}
