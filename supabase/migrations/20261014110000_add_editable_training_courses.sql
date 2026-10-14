create table if not exists public.training_courses (
  id text primary key,
  name text not null check (char_length(name) <= 140),
  duration text not null default '' check (char_length(duration) <= 40),
  price_label text not null default '' check (char_length(price_label) <= 40),
  amount_vnd integer not null default 0 check (amount_vnd >= 0),
  sale_price_label text not null default '' check (char_length(sale_price_label) <= 40),
  sale_amount_vnd integer null check (sale_amount_vnd is null or sale_amount_vnd >= 0),
  transfer_label text not null default '' check (char_length(transfer_label) <= 80),
  bonus text not null default '' check (char_length(bonus) <= 180),
  highlight text not null default '' check (char_length(highlight) <= 260),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.training_courses enable row level security;

drop policy if exists "Anyone can read visible training courses" on public.training_courses;
create policy "Anyone can read visible training courses"
  on public.training_courses
  for select
  to anon, authenticated
  using (is_visible = true);

drop policy if exists "Admins manage training courses" on public.training_courses;
create policy "Admins manage training courses"
  on public.training_courses
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

insert into public.training_courses
  (id, name, duration, price_label, amount_vnd, sale_price_label, sale_amount_vnd, transfer_label, bonus, highlight, sort_order, is_visible)
values
  ('khoa-hinh-anh-cap-toc', 'Khóa làm hình ảnh cấp tốc', '2 buổi', '999k', 999000, '', null, 'KHOAHOC HINHANH', 'Kèm 5 skill hình ảnh tự chọn', 'Phù hợp khi bạn muốn tự tạo ảnh bán hàng, poster, ảnh sản phẩm nhanh.', 1, true),
  ('khoa-video-cap-toc', 'Khóa làm video cấp tốc', '2 buổi', '999k', 999000, '', null, 'KHOAHOC VIDEO', 'Kèm 5 skill hình ảnh + video tùy chọn', 'Dành cho nhu cầu dựng video ngắn, video bán hàng và nội dung đăng mạng xã hội.', 2, true),
  ('khoa-tao-skill-website', 'Khóa tạo skill + làm website', '2 buổi', '999k', 999000, '', null, 'KHOAHOC SKILL WEBSITE', 'Kèm 5 skill tùy chọn', 'Học cách đóng gói công cụ AI riêng và tạo website giới thiệu hoặc bán sản phẩm.', 3, true),
  ('khoa-automation-vibe-coding', 'Khóa automation + vibe coding', '4 buổi', '1.999k', 1999000, '', null, 'KHOAHOC AUTOMATION VIBECODING', 'Kèm 10 skill tùy chọn', 'Bao gồm 1 buổi hình ảnh, 1 buổi video và phần tự động hóa quy trình làm việc.', 4, true),
  ('khoa-tong-hop', 'Khóa tổng hợp', '8 buổi', '3.999.000đ', 3999000, '', null, 'KHOAHOC TONGHOP', 'Kèm toàn bộ skill và update trọn đời', 'Lộ trình đầy đủ để làm chủ hình ảnh, video, skill, website, automation và vibe coding.', 5, true)
on conflict (id) do nothing;

create or replace function public.create_training_order(
  p_course_slug text,
  p_order_code text
)
returns table (
  order_id uuid,
  order_code text,
  total_amount integer,
  transfer_note text,
  product_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course record;
  v_total_amount integer;
  v_order_id uuid;
  v_transfer_note text;
begin
  if p_order_code !~ '^SC[A-Z0-9]{8,16}$' then
    raise exception 'Mã đơn không hợp lệ.';
  end if;

  select *
  into v_course
  from public.training_courses
  where id = p_course_slug and is_visible = true;

  if v_course.id is null then
    raise exception 'Khóa huấn luyện không hợp lệ.';
  end if;

  v_total_amount := coalesce(v_course.sale_amount_vnd, v_course.amount_vnd);
  v_transfer_note := p_order_code || ' ' || v_course.transfer_label;

  insert into public.orders (order_code, status, currency, total_amount, transfer_note)
  values (p_order_code, 'pending', 'VND', v_total_amount, v_transfer_note)
  returning id into v_order_id;

  insert into public.order_items (order_id, skill_id, skill_title, unit_amount)
  values (v_order_id, null, v_course.name, v_total_amount);

  return query
  select v_order_id, p_order_code, v_total_amount, v_transfer_note, 1;
end;
$$;

revoke execute on function public.create_training_order(text, text) from public;
grant execute on function public.create_training_order(text, text) to anon, authenticated;
