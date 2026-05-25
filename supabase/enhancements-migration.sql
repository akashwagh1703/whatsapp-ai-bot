-- Optional performance / idempotency helpers (run in Supabase SQL Editor).

create unique index if not exists messages_wa_message_id_unique
  on public.messages (wa_message_id)
  where wa_message_id is not null;
