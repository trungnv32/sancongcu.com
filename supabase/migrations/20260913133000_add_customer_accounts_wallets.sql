-- Customer accounts, wallets, and Webapp activity are intentionally separate
-- from the existing Skill-purchase orders.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  balance_vnd integer not null default 0 check (balance_vnd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null check (entry_type in ('topup', 'hold', 'charge', 'release', 'refund', 'adjustment')),
  direction text not null check (direction in ('credit', 'debit')),
  amount_vnd integer not null check (amount_vnd > 0),
  reference_type text,
  reference_id uuid,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  amount_vnd integer not null check (amount_vnd >= 5000),
  transfer_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  payment_proof_path text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.webapp_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  skill_id uuid not null references public.skills(id) on delete restrict,
  quoted_amount_vnd integer not null check (quoted_amount_vnd >= 0),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  input_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(input_paths) = 'array'),
  output_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(output_paths) = 'array'),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.wallet_topups enable row level security;
alter table public.webapp_jobs enable row level security;

grant select on public.profiles, public.wallets, public.wallet_ledger, public.wallet_topups, public.webapp_jobs to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "Customers can read their profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Customers can update their display name" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Customers can read their wallet" on public.wallets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Customers can read their wallet ledger" on public.wallet_ledger
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Customers can read their topups" on public.wallet_topups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Customers can read their Webapp jobs" on public.webapp_jobs
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    new.phone
  )
  on conflict (user_id) do nothing;

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_customer() from public, anon, authenticated;

drop trigger if exists on_auth_customer_created on auth.users;
create trigger on_auth_customer_created
  after insert on auth.users
  for each row execute procedure public.handle_new_customer();

insert into public.profiles (user_id, display_name, email, phone)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', ''),
  email,
  phone
from auth.users
on conflict (user_id) do nothing;

insert into public.wallets (user_id)
select id from auth.users
on conflict (user_id) do nothing;
