create or replace function public.create_pending_order(
  p_skill_slugs text[],
  p_order_code text,
  p_combo_size integer default null
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
  v_requested_count integer;
  v_selected_count integer;
  v_total_amount integer;
  v_order_id uuid;
  v_transfer_note text;
  v_combo10_count integer;
  v_remainder integer;
  v_combo5_count integer;
  v_single_count integer;
begin
  if coalesce(cardinality(p_skill_slugs), 0) < 1 then
    raise exception 'Cần chọn ít nhất 1 Skill.';
  end if;

  if p_order_code !~ '^SC[A-Z0-9]{8,16}$' then
    raise exception 'Mã đơn không hợp lệ.';
  end if;

  select count(*) into v_requested_count
  from (select distinct unnest(p_skill_slugs) as slug) requested;

  select count(*)
    into v_selected_count
  from public.skills s
  where s.slug in (select distinct unnest(p_skill_slugs))
    and s.status = 'published';

  if v_selected_count <> v_requested_count then
    raise exception 'Một hoặc nhiều Skill không còn khả dụng.';
  end if;

  v_combo10_count := v_selected_count / 10;
  v_remainder := v_selected_count % 10;
  v_combo5_count := case when v_remainder >= 5 then 1 else 0 end;
  v_single_count := v_remainder - v_combo5_count * 5;

  v_total_amount := v_combo10_count * 899000
    + v_combo5_count * 208000
    + v_single_count * 51000;
  v_transfer_note := p_order_code || ' ' || v_selected_count || 'SKILL'
    || case when v_combo10_count > 0 then ' C10X' || v_combo10_count else '' end
    || case when v_combo5_count > 0 then ' C5' else '' end
    || case when v_single_count > 0 then ' LE' || v_single_count else '' end;

  insert into public.orders (order_code, status, currency, total_amount, transfer_note)
  values (p_order_code, 'pending', 'VND', v_total_amount, v_transfer_note)
  returning id into v_order_id;

  insert into public.order_items (order_id, skill_id, skill_title, unit_amount)
  select v_order_id, s.id, s.title, 0
  from public.skills s
  where s.slug in (select distinct unnest(p_skill_slugs))
    and s.status = 'published'
  order by s.sort_order, s.title;

  if v_combo10_count > 0 then
    insert into public.order_items (order_id, skill_id, skill_title, unit_amount)
    values (v_order_id, null, 'Quà tặng: Khoá huấn luyện 4 buổi', 0);
  end if;

  return query
  select v_order_id, p_order_code, v_total_amount, v_transfer_note, v_selected_count;
end;
$$;

revoke execute on function public.create_pending_order(text[], text, integer) from public;
grant execute on function public.create_pending_order(text[], text, integer) to anon, authenticated;
