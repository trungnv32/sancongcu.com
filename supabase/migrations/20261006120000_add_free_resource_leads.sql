create table if not exists public.free_resource_leads (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid null references public.free_resources(id) on delete set null,
  resource_title text not null default '' check (char_length(resource_title) <= 180),
  full_name text not null check (char_length(full_name) <= 120),
  email text not null check (char_length(email) <= 254),
  file_url text not null default '',
  file_name text not null default '' check (char_length(file_name) <= 220),
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  email_error text not null default '' check (char_length(email_error) <= 500),
  resend_email_id text not null default '' check (char_length(resend_email_id) <= 120),
  created_at timestamptz not null default now(),
  sent_at timestamptz null
);

create index if not exists free_resource_leads_created_at_idx
  on public.free_resource_leads (created_at desc);

create index if not exists free_resource_leads_email_idx
  on public.free_resource_leads (lower(email));

alter table public.free_resource_leads enable row level security;

drop policy if exists "Admins read free resource leads" on public.free_resource_leads;
create policy "Admins read free resource leads"
  on public.free_resource_leads
  for select
  to authenticated
  using (private.is_admin());

drop policy if exists "Admins manage free resource leads" on public.free_resource_leads;
create policy "Admins manage free resource leads"
  on public.free_resource_leads
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());
