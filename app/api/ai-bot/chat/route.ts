import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureAiSettings, getOrCreateBusiness } from "@/lib/business";
import { resolveAiModel } from "@/lib/ai-model";
import { buildSystemPrompt } from "@/services/ai.service";
import {
  OpenRouterChatbotError,
  openRouterChat,
} from "@/services/openrouter-chatbot.service";

const schema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(12)
    .optional(),
});

export const maxDuration = 60;

/** Test the OpenRouter chatbot (same brain as WhatsApp auto-reply). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const business = await getOrCreateBusiness(supabase, user.id);
  const ai = await ensureAiSettings(supabase, business.id as string);
  const model = resolveAiModel(ai.model);
  const systemPrompt = buildSystemPrompt(ai);

  try {
    const result = await openRouterChat({
      systemPrompt,
      userMessage: parsed.data.message,
      history: parsed.data.history,
      model,
    });

    return NextResponse.json({
      ok: true,
      reply: result.content,
      model: result.model,
      usedFallback: result.usedFallback ?? false,
      modelsAttempted: result.modelsAttempted,
      aiEnabled: ai.enabled,
    });
  } catch (e) {
    const message =
      e instanceof OpenRouterChatbotError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Chat failed";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint: "Set OPENROUTER_API_KEY and OPENROUTER_DEFAULT_MODEL in .env.local or Vercel, then redeploy.",
      },
      { status: e instanceof OpenRouterChatbotError && !e.statusCode ? 503 : 502 }
    );
  }
}
