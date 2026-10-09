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
  v_course_title text;
  v_total_amount integer;
  v_transfer_label text;
  v_order_id uuid;
  v_transfer_note text;
begin
  if p_order_code !~ '^SC[A-Z0-9]{8,16}$' then
    raise exception 'Mã đơn không hợp lệ.';
  end if;

  v_course_title := case p_course_slug
    when 'khoa-hinh-anh-cap-toc' then 'Khóa làm hình ảnh cấp tốc'
    when 'khoa-video-cap-toc' then 'Khóa làm video cấp tốc'
    when 'khoa-tao-skill-website' then 'Khóa tạo skill + làm website'
    when 'khoa-automation-vibe-coding' then 'Khóa automation + vibe coding'
    when 'khoa-tong-hop' then 'Khóa tổng hợp'
  end;

  v_total_amount := case p_course_slug
    when 'khoa-hinh-anh-cap-toc' then 999000
    when 'khoa-video-cap-toc' then 999000
    when 'khoa-tao-skill-website' then 999000
    when 'khoa-automation-vibe-coding' then 1999000
    when 'khoa-tong-hop' then 3999000
  end;

  v_transfer_label := case p_course_slug
    when 'khoa-hinh-anh-cap-toc' then ' KHOAHOC HINHANH'
    when 'khoa-video-cap-toc' then ' KHOAHOC VIDEO'
    when 'khoa-tao-skill-website' then ' KHOAHOC SKILL WEBSITE'
    when 'khoa-automation-vibe-coding' then ' KHOAHOC AUTOMATION VIBECODING'
    when 'khoa-tong-hop' then ' KHOAHOC TONGHOP'
  end;

  if v_course_title is null or v_total_amount is null or v_transfer_label is null then
    raise exception 'Khóa huấn luyện không hợp lệ.';
  end if;

  v_transfer_note := p_order_code || v_transfer_label;

  insert into public.orders (order_code, status, currency, total_amount, transfer_note)
  values (p_order_code, 'pending', 'VND', v_total_amount, v_transfer_note)
  returning id into v_order_id;

  insert into public.order_items (order_id, skill_id, skill_title, unit_amount)
  values (v_order_id, null, v_course_title, v_total_amount);

  return query
  select v_order_id, p_order_code, v_total_amount, v_transfer_note, 1;
end;
$$;

revoke execute on function public.create_training_order(text, text) from public;
grant execute on function public.create_training_order(text, text) to anon, authenticated;
