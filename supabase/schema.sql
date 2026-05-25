-- AI WhatsApp Assistant Platform — Supabase Schema
-- Run in Supabase SQL Editor

create extension if not exists "uuid-ossp";

-- Businesses (one per authenticated user for MVP)
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Business',
  logo_url text,
  primary_color text default '#059669',
  secondary_color text default '#0d9488',
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null default 'Customer',
  phone text not null,
  lead_source text default 'whatsapp',
  notes text,
  last_interaction_at timestamptz default now(),
  created_at timestamptz not null default now(),
  unique (business_id, phone)
);

create index if not exists contacts_business_idx on public.contacts(business_id);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed', 'handoff')),
  ai_enabled boolean not null default true,
  unread_count int not null default 0,
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz not null default now(),
  unique (business_id, contact_id)
);

create index if not exists conversations_business_idx on public.conversations(business_id);
create index if not exists conversations_last_msg_idx on public.conversations(business_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  content text,
  media_url text,
  media_type text,
  is_ai boolean not null default false,
  wa_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

create table if not exists public.ai_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  enabled boolean not null default true,
  prompt text default 'You are a helpful business assistant.',
  tone text not null default 'professional' check (tone in ('professional', 'friendly', 'sales', 'luxury')),
  model text not null default 'minimax/minimax-m2.5:free',
  business_knowledge text,
  reply_language text default 'auto',
  human_handoff boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.automations (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  welcome_enabled boolean not null default false,
  welcome_message text,
  away_enabled boolean not null default false,
  away_message text,
  keyword_replies jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_daily (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  date date not null,
  conversations int not null default 0,
  ai_replies int not null default 0,
  human_replies int not null default 0,
  leads int not null default 0,
  unique (business_id, date)
);

create index if not exists analytics_business_date_idx on public.analytics_daily(business_id, date desc);

create table if not exists public.integration_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  webhook_url text,
  api_token text default encode(gen_random_bytes(32), 'hex'),
  events jsonb not null default '["new_message","new_lead","ai_handoff"]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  whatsapp_phone_id text,
  whatsapp_access_token text,
  whatsapp_verify_token text,
  openrouter_api_key text,
  openrouter_model text,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_business_idx on public.notifications(business_id, created_at desc);

-- Debug: last Meta webhook calls (run schema if missing)
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fields text,
  messages_count int not null default 0,
  warning text,
  first_result text
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger businesses_updated before update on public.businesses
  for each row execute function public.set_updated_at();

-- RLS
alter table public.businesses enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_settings enable row level security;
alter table public.automations enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.integration_settings enable row level security;
alter table public.app_settings enable row level security;
alter table public.notifications enable row level security;

create or replace function public.user_business_ids()
returns setof uuid as $$
  select id from public.businesses where user_id = auth.uid();
$$ language sql stable security definer;

create policy "businesses_own" on public.businesses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "contacts_own" on public.contacts
  for all using (business_id in (select public.user_business_ids()));

create policy "conversations_own" on public.conversations
  for all using (business_id in (select public.user_business_ids()));

create policy "messages_own" on public.messages
  for all using (
    conversation_id in (
      select c.id from public.conversations c
      where c.business_id in (select public.user_business_ids())
    )
  );

create policy "ai_settings_own" on public.ai_settings
  for all using (business_id in (select public.user_business_ids()));

create policy "automations_own" on public.automations
  for all using (business_id in (select public.user_business_ids()));

create policy "analytics_own" on public.analytics_daily
  for all using (business_id in (select public.user_business_ids()));

create policy "integration_own" on public.integration_settings
  for all using (business_id in (select public.user_business_ids()));

create policy "app_settings_own" on public.app_settings
  for all using (business_id in (select public.user_business_ids()));

create policy "notifications_own" on public.notifications
  for all using (business_id in (select public.user_business_ids()));

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.notifications;
