import type { AiTone } from "@/types";
import { getDefaultAiModel } from "@/lib/ai-model";

export const APP_NAME = "FlowChat AI";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/inbox", label: "Inbox", icon: "Inbox" },
  { href: "/ai-bot", label: "AI Bot", icon: "Bot" },
  { href: "/automations", label: "Automations", icon: "Zap" },
  { href: "/contacts", label: "Contacts", icon: "Users" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/integrations", label: "Integrations", icon: "Plug" },
  { href: "/webhook-test", label: "Webhook test", icon: "FlaskConical" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;

export const AI_TONES: { value: AiTone; label: string; description: string }[] = [
  { value: "professional", label: "Professional", description: "Clear, polite, and business-ready" },
  { value: "friendly", label: "Friendly", description: "Warm and conversational" },
  { value: "sales", label: "Sales Focused", description: "Helpful with gentle conversion" },
  { value: "luxury", label: "Luxury Brand", description: "Refined and premium tone" },
];

export const DEFAULT_AI_MODEL = getDefaultAiModel();

export const AI_MODELS = [
  {
    value: DEFAULT_AI_MODEL,
    label: `Env free model (${DEFAULT_AI_MODEL})`,
  },
  { value: "minimax/minimax-m2.5:free", label: "MiniMax M2.5 (free, recommended)" },
  { value: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 (free)" },
  { value: "qwen/qwen3-4b:free", label: "Qwen3 4B (free)" },
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o mini" },
] as const;

export const INTEGRATION_EVENTS = [
  { value: "new_message", label: "New message" },
  { value: "new_lead", label: "New lead" },
  { value: "ai_handoff", label: "AI handoff" },
] as const;

export const HUMAN_HANDOFF_KEYWORDS = [
  "human",
  "agent",
  "representative",
  "speak to someone",
  "real person",
];

export const RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 60,
};
