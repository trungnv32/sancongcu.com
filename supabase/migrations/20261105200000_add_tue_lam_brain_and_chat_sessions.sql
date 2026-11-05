create table if not exists public.tue_lam_brain (
  id smallint primary key default 1 check (id = 1),
  file_name text not null default 'TU-LAM-AI-BRAIN.md',
  markdown text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.tue_lam_brain enable row level security;
create policy "Admins manage Tue Lam brain"
  on public.tue_lam_brain for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create table if not exists public.tue_lam_chat_sessions (
  id uuid primary key,
  page_url text not null default '',
  customer_phone text not null default '',
  telegram_message_id bigint unique,
  telegram_alerted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tue_lam_chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.tue_lam_chat_sessions(id) on delete cascade,
  role text not null check (role in ('customer', 'assistant', 'human')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists tue_lam_chat_messages_session_idx
  on public.tue_lam_chat_messages(session_id, id);
alter table public.tue_lam_chat_sessions enable row level security;
alter table public.tue_lam_chat_messages enable row level security;
revoke all on public.tue_lam_chat_sessions, public.tue_lam_chat_messages from anon, authenticated;
grant all on public.tue_lam_chat_sessions, public.tue_lam_chat_messages to service_role;
grant usage, select on sequence public.tue_lam_chat_messages_id_seq to service_role;

create table if not exists public.tue_lam_telegram_config (
  id smallint primary key default 1 check (id = 1),
  webhook_secret text not null,
  updated_at timestamptz not null default now()
);
alter table public.tue_lam_telegram_config enable row level security;
revoke all on public.tue_lam_telegram_config from anon, authenticated;
grant all on public.tue_lam_telegram_config to service_role;
