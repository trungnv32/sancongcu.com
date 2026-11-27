-- Tuệ Lâm × Telegram: chế độ "nhắc bài" (J20261127-10).
-- Chạy lại nhiều lần không lỗi: mọi lệnh đều có if exists / if not exists.

-- 1) Tin nhắn: thêm role 'hint' (lời nhắc nội bộ của anh, không bao giờ gửi khách)
--    và cờ den_sau (lời Tuệ Lâm đến sau, web lấy qua poll).
alter table public.tue_lam_chat_messages
  drop constraint if exists tue_lam_chat_messages_role_check;
alter table public.tue_lam_chat_messages
  add constraint tue_lam_chat_messages_role_check
  check (role in ('customer', 'assistant', 'human', 'hint'));

alter table public.tue_lam_chat_messages
  add column if not exists den_sau boolean not null default false;

create index if not exists tue_lam_chat_messages_den_sau_idx
  on public.tue_lam_chat_messages(session_id, id)
  where den_sau;

-- 2) Phiên chat: chế độ anh vào cuộc + câu nháp chờ duyệt.
alter table public.tue_lam_chat_sessions
  add column if not exists anh_vao_cuoc_den timestamptz,
  add column if not exists nhap_tra_loi text,
  add column if not exists nhap_cho_tin_id bigint,
  add column if not exists nhap_luc timestamptz;

create index if not exists tue_lam_chat_sessions_vao_cuoc_idx
  on public.tue_lam_chat_sessions(anh_vao_cuoc_den)
  where anh_vao_cuoc_den is not null;

-- 3) Cấu hình Telegram: số phút vào cuộc, số giây chờ duyệt, chống xử lý trùng.
alter table public.tue_lam_telegram_config
  add column if not exists phut_vao_cuoc integer not null default 5,
  add column if not exists giay_cho integer not null default 0,
  add column if not exists update_id_cuoi bigint;

alter table public.tue_lam_telegram_config
  drop constraint if exists tue_lam_telegram_config_phut_vao_cuoc_check;
alter table public.tue_lam_telegram_config
  add constraint tue_lam_telegram_config_phut_vao_cuoc_check
  check (phut_vao_cuoc between 1 and 120);
alter table public.tue_lam_telegram_config
  drop constraint if exists tue_lam_telegram_config_giay_cho_check;
alter table public.tue_lam_telegram_config
  add constraint tue_lam_telegram_config_giay_cho_check
  check (giay_cho between 0 and 600);

-- 4) Bảng nối tin Telegram ↔ phiên chat: Reply vào bất kỳ tin nào của khách đều tìm được khách.
create table if not exists public.tue_lam_telegram_links (
  telegram_message_id bigint primary key,
  session_id uuid not null references public.tue_lam_chat_sessions(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists tue_lam_telegram_links_session_idx
  on public.tue_lam_telegram_links(session_id);

alter table public.tue_lam_telegram_links enable row level security;
revoke all on public.tue_lam_telegram_links from anon, authenticated;
grant all on public.tue_lam_telegram_links to service_role;

-- Tin báo cũ (trước bản này) vẫn Reply được: chép telegram_message_id sẵn có sang bảng nối.
insert into public.tue_lam_telegram_links (telegram_message_id, session_id)
select telegram_message_id, id
from public.tue_lam_chat_sessions
where telegram_message_id is not null
on conflict (telegram_message_id) do nothing;
