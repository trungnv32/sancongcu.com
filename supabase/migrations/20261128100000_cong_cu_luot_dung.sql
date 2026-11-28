-- Công cụ trên web (J20261128-03): đếm lượt dùng mỗi ngày của khách ĐÃ ĐĂNG NHẬP.
-- Hiện dùng cho "Chèn chữ lên ảnh": mỗi lần lưu ảnh = 1 lượt, tối đa 5 lượt/ngày/tài khoản,
-- ngày tính theo giờ Việt Nam (làm mới lúc 0:00 Asia/Ho_Chi_Minh).
-- Khách không tự ghi được vào bảng; chỉ gọi 2 hàm bên dưới (hàm tự lấy auth.uid(), không nhận user_id từ ngoài).
-- Chạy lại nhiều lần không lỗi.

create table if not exists public.cong_cu_luot_dung (
  user_id uuid not null references auth.users(id) on delete cascade,
  cong_cu text not null,
  ngay date not null,
  so_luot integer not null default 0 check (so_luot >= 0),
  cap_nhat_luc timestamptz not null default now(),
  primary key (user_id, cong_cu, ngay)
);

alter table public.cong_cu_luot_dung enable row level security;
-- Không có policy nào cho anon/authenticated: khách không đọc, không sửa trực tiếp được.
revoke all on table public.cong_cu_luot_dung from public, anon, authenticated;
grant all on table public.cong_cu_luot_dung to service_role;

-- Giới hạn từng công cụ (công cụ lạ => null => từ chối).
create or replace function public.gioi_han_cong_cu(p_cong_cu text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_cong_cu
    when 'chen-chu-len-anh' then 5
    else null
  end;
$$;

-- Trừ 1 lượt (nguyên tử: insert ... on conflict do update ... where so_luot < giới hạn).
-- Trả về {"ok": true|false, "con_lai": n, "gioi_han": n}. Hết lượt thì ok=false, không trừ thêm.
create or replace function public.dung_luot_cong_cu(p_cong_cu text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_gioi_han integer := public.gioi_han_cong_cu(p_cong_cu);
  v_ngay date := (pg_catalog.now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_so integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if v_gioi_han is null then raise exception 'UNKNOWN_TOOL' using errcode = '22023'; end if;

  insert into public.cong_cu_luot_dung as l (user_id, cong_cu, ngay, so_luot)
  values (v_uid, p_cong_cu, v_ngay, 1)
  on conflict (user_id, cong_cu, ngay)
  do update set so_luot = l.so_luot + 1, cap_nhat_luc = pg_catalog.now()
  where l.so_luot < v_gioi_han
  returning l.so_luot into v_so;

  if v_so is null then
    return jsonb_build_object('ok', false, 'con_lai', 0, 'gioi_han', v_gioi_han);
  end if;
  return jsonb_build_object('ok', true, 'con_lai', greatest(v_gioi_han - v_so, 0), 'gioi_han', v_gioi_han);
end;
$$;

-- Xem số lượt còn lại hôm nay (không trừ).
create or replace function public.xem_luot_cong_cu(p_cong_cu text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_gioi_han integer := public.gioi_han_cong_cu(p_cong_cu);
  v_so integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if v_gioi_han is null then raise exception 'UNKNOWN_TOOL' using errcode = '22023'; end if;
  select l.so_luot into v_so
  from public.cong_cu_luot_dung l
  where l.user_id = v_uid
    and l.cong_cu = p_cong_cu
    and l.ngay = (pg_catalog.now() at time zone 'Asia/Ho_Chi_Minh')::date;
  return jsonb_build_object('ok', true, 'con_lai', greatest(v_gioi_han - coalesce(v_so, 0), 0), 'gioi_han', v_gioi_han);
end;
$$;

revoke all on function public.gioi_han_cong_cu(text) from public, anon;
grant execute on function public.gioi_han_cong_cu(text) to authenticated, service_role;
revoke all on function public.dung_luot_cong_cu(text) from public, anon;
grant execute on function public.dung_luot_cong_cu(text) to authenticated;
revoke all on function public.xem_luot_cong_cu(text) from public, anon;
grant execute on function public.xem_luot_cong_cu(text) to authenticated;
