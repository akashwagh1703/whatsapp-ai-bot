export type AiTone = "professional" | "friendly" | "sales" | "luxury";

export type ConversationStatus = "open" | "closed" | "handoff";

export type MessageDirection = "inbound" | "outbound";

export interface Business {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  lead_source: string | null;
  notes: string | null;
  last_interaction_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  business_id: string;
  contact_id: string;
  status: ConversationStatus;
  ai_enabled: boolean;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  contact?: Contact;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  is_ai: boolean;
  wa_message_id: string | null;
  created_at: string;
}

export interface AiSettings {
  business_id: string;
  enabled: boolean;
  prompt: string | null;
  tone: AiTone;
  model: string;
  business_knowledge: string | null;
  human_handoff: boolean;
  updated_at: string;
}

export interface Automations {
  business_id: string;
  welcome_enabled: boolean;
  welcome_message: string | null;
  away_enabled: boolean;
  away_message: string | null;
  keyword_replies: KeywordReply[];
  updated_at: string;
}

export interface KeywordReply {
  keyword: string;
  reply: string;
}

export interface AnalyticsDaily {
  id: string;
  business_id: string;
  date: string;
  conversations: number;
  ai_replies: number;
  human_replies: number;
  leads: number;
}

export interface IntegrationSettings {
  business_id: string;
  webhook_url: string | null;
  api_token: string | null;
  events: string[];
  updated_at: string;
}

export interface AppSettings {
  business_id: string;
  whatsapp_phone_id: string | null;
  whatsapp_access_token: string | null;
  whatsapp_verify_token: string | null;
  openrouter_api_key: string | null;
  openrouter_model: string | null;
  updated_at: string;
}

export interface DashboardStats {
  totalConversations: number;
  aiReplies: number;
  humanReplies: number;
  leadsGenerated: number;
  activeConversations: number;
  responseRate: number;
}
