-- Private, versioned package files used by AI agents to install purchased Skills.
create table public.skill_packages (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  version text not null default '1.0.0' check (char_length(version) <= 40),
  file_path text not null unique,
  file_name text not null check (char_length(file_name) <= 255),
  content_type text not null,
  byte_size bigint not null check (byte_size > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index skill_packages_one_active_per_skill
  on public.skill_packages (skill_id)
  where is_active;

create index skill_packages_skill_id_created_at_idx
  on public.skill_packages (skill_id, created_at desc);

alter table public.skill_packages enable row level security;

create policy "Admins manage skill packages"
  on public.skill_packages
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- A distinct bearer link belongs to each purchased Skill line in an order.
create table public.skill_entitlements (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  skill_package_id uuid not null references public.skill_packages(id) on delete restrict,
  install_token text not null unique check (char_length(install_token) >= 32),
  max_installs smallint not null default 10 check (max_installs between 1 and 50),
  install_count integer not null default 0 check (install_count >= 0),
  last_installed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index skill_entitlements_package_id_idx
  on public.skill_entitlements (skill_package_id);

alter table public.skill_entitlements enable row level security;

create policy "Admins manage skill entitlements"
  on public.skill_entitlements
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'skill-packages',
  'skill-packages',
  false,
  26214400,
  array['text/markdown', 'application/zip', 'application/x-zip-compressed']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins upload private skill packages"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'skill-packages' and private.is_admin());

create policy "Admins read private skill packages"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'skill-packages' and private.is_admin());

create policy "Admins update private skill packages"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'skill-packages' and private.is_admin())
  with check (bucket_id = 'skill-packages' and private.is_admin());

create policy "Admins delete private skill packages"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'skill-packages' and private.is_admin());
