create table if not exists public.site_config (
  id text primary key default 'main',
  zalo_group_url text not null default '',
  zalo_group_qr_url text not null default '',
  support_zalo_url text not null default '',
  support_zalo_qr_url text not null default '',
  payment_qr_url text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_config enable row level security;

drop policy if exists "Anyone can read site config" on public.site_config;
create policy "Anyone can read site config"
  on public.site_config
  for select
  using (true);

drop policy if exists "Admins manage site config" on public.site_config;
create policy "Admins manage site config"
  on public.site_config
  for all
  using (private.is_admin())
  with check (private.is_admin());

insert into public.site_config
  (id, zalo_group_url, zalo_group_qr_url, support_zalo_url, support_zalo_qr_url, payment_qr_url)
values
  ('main', 'https://zalo.me/g/8nwpbixavealgevx4p1b', '', 'https://zalo.me/0938069668', '', '')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read site assets" on storage.objects;
create policy "Anyone can read site assets"
  on storage.objects
  for select
  using (bucket_id = 'site-assets');

drop policy if exists "Admins upload site assets" on storage.objects;
create policy "Admins upload site assets"
  on storage.objects
  for insert
  with check (bucket_id = 'site-assets' and private.is_admin());

drop policy if exists "Admins update site assets" on storage.objects;
create policy "Admins update site assets"
  on storage.objects
  for update
  using (bucket_id = 'site-assets' and private.is_admin())
  with check (bucket_id = 'site-assets' and private.is_admin());
