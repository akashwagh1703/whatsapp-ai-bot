-- Flow-based WhatsApp bot engine (run after schema.sql)
-- Safe to re-run: uses IF NOT EXISTS

create table if not exists public.flows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug text not null,
  name text not null,
  enabled boolean not null default true,
  priority int not null default 100,
  triggers jsonb not null default '[]'::jsonb,
  definition jsonb not null default '{"steps":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);

create index if not exists flows_business_enabled_idx
  on public.flows (business_id, enabled, priority);

create table if not exists public.flow_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  flow_id uuid not null references public.flows(id) on delete cascade,
  current_step_id text not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'expired', 'cancelled')),
  context jsonb not null default '{}'::jsonb,
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flow_sessions_conversation_idx
  on public.flow_sessions (conversation_id, status);

create unique index if not exists flow_sessions_one_active_per_conversation
  on public.flow_sessions (conversation_id)
  where status = 'active';

create trigger flows_updated before update on public.flows
  for each row execute function public.set_updated_at();

create trigger flow_sessions_updated before update on public.flow_sessions
  for each row execute function public.set_updated_at();

alter table public.flows enable row level security;
alter table public.flow_sessions enable row level security;

create policy "flows_own" on public.flows
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));

create policy "flow_sessions_own" on public.flow_sessions
  for all using (business_id in (select public.user_business_ids()))
  with check (business_id in (select public.user_business_ids()));
