-- Run in Supabase SQL Editor if your project was created before branding columns.

alter table public.businesses
  add column if not exists primary_color text default '#059669';

alter table public.businesses
  add column if not exists secondary_color text default '#0d9488';

insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', true)
on conflict (id) do update set public = true;

create policy "business_assets_public_read"
on storage.objects for select
using (bucket_id = 'business-assets');

create policy "business_assets_owner_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] in (
    select id::text from public.businesses where user_id = auth.uid()
  )
);

create policy "business_assets_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] in (
    select id::text from public.businesses where user_id = auth.uid()
  )
);

create policy "business_assets_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] in (
    select id::text from public.businesses where user_id = auth.uid()
  )
);
