alter table public.ai_settings
  add column if not exists reply_language text default 'auto';
