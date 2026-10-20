update public.site_menu_items
set label = 'Combo ưu đãi'
where id = 'training';

update public.site_pages
set
  menu_label = 'Combo ưu đãi',
  eyebrow = 'Combo skill ưu đãi',
  title = 'Chọn combo skill phù hợp với công việc của bạn',
  summary = 'Các combo gồm bộ skill thực hành kèm buổi hướng dẫn sử dụng, giúp bạn nhanh chóng áp dụng AI vào công việc và tạo sản phẩm thực tế.',
  content_blocks = array[
    'Mỗi combo cung cấp một nhóm skill theo đúng nhu cầu: hình ảnh, video, thương mại, website, automation hoặc trọn bộ.',
    'Các buổi HDSD đi kèm giúp bạn cài đặt, làm quen và áp dụng skill vào những tình huống công việc thực tế.',
    'Bạn có thể chọn combo vừa đủ cho nhu cầu hiện tại hoặc combo All In One để sử dụng toàn bộ skill và nhận hướng dẫn đầy đủ.'
  ]::text[]
where id = 'training';

update public.training_courses
set
  name = case id
    when 'khoa-hinh-anh-cap-toc' then 'Combo skill làm hình ảnh'
    when 'khoa-video-cap-toc' then 'Combo skill làm video'
    when 'khoa-tao-skill-website' then 'Combo skill thương mại + làm website'
    when 'khoa-automation-vibe-coding' then 'Combo Automation + vibe coding'
    when 'khoa-tong-hop' then 'Combo All In One - Toàn bộ skill'
  end,
  duration = case id
    when 'khoa-hinh-anh-cap-toc' then 'Combo 5 skill hình ảnh + 2 buổi HDSD'
    when 'khoa-video-cap-toc' then 'Combo 5 skill edit video + 2 buổi HDSD'
    when 'khoa-tao-skill-website' then 'Combo 5 skill thương mại + 2 buổi HDSD'
    when 'khoa-automation-vibe-coding' then 'Combo 10 skill kèm 4 buổi HDSD'
    when 'khoa-tong-hop' then 'Combo toàn bộ skill + 8 buổi HDSD'
  end,
  transfer_label = case id
    when 'khoa-hinh-anh-cap-toc' then 'COMBO HINHANH'
    when 'khoa-video-cap-toc' then 'COMBO VIDEO'
    when 'khoa-tao-skill-website' then 'COMBO SKILL WEBSITE'
    when 'khoa-automation-vibe-coding' then 'COMBO AUTOMATION VIBECODING'
    when 'khoa-tong-hop' then 'COMBO ALL IN ONE'
  end,
  highlight = case id
    when 'khoa-tao-skill-website' then 'Gồm các skill phục vụ công việc thương mại và hướng dẫn làm website giới thiệu hoặc bán sản phẩm.'
    when 'khoa-automation-vibe-coding' then 'Gồm 10 skill tùy chọn và 4 buổi hướng dẫn sử dụng về hình ảnh, video, tự động hóa và vibe coding.'
    else highlight
  end,
  updated_at = now()
where id in (
  'khoa-hinh-anh-cap-toc',
  'khoa-video-cap-toc',
  'khoa-tao-skill-website',
  'khoa-automation-vibe-coding',
  'khoa-tong-hop'
);

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
    raise exception 'Combo ưu đãi không hợp lệ.';
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
