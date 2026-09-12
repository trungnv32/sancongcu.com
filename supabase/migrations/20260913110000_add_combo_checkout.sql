-- Combo pricing is validated in the database so the browser cannot alter it.
create function public.create_pending_order(
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
begin
  if coalesce(cardinality(p_skill_slugs), 0) not between 1 and 20 then
    raise exception 'Cần chọn từ 1 đến 20 Skill.';
  end if;

  if p_order_code !~ '^SC[A-Z0-9]{8,16}$' then
    raise exception 'Mã đơn không hợp lệ.';
  end if;

  if p_combo_size is not null and p_combo_size not in (5, 10) then
    raise exception 'Combo không hợp lệ.';
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

  if p_combo_size is not null and v_selected_count <> p_combo_size then
    raise exception 'Cần chọn đủ số Skill của combo trước khi thanh toán.';
  end if;

  v_total_amount := case p_combo_size
    when 5 then 208000
    when 10 then 650000
    else (
      select coalesce(sum(s.activation_price_vnd), 0)
      from public.skills s
      where s.slug in (select distinct unnest(p_skill_slugs))
        and s.status = 'published'
    )
  end;

  v_transfer_note := p_order_code || case p_combo_size
    when 5 then ' COMBO5 5SKILL'
    when 10 then ' COMBO10 10SKILL'
    else ' ' || v_selected_count || 'SKILL'
  end;

  insert into public.orders (order_code, status, currency, total_amount, transfer_note)
  values (p_order_code, 'pending', 'VND', v_total_amount, v_transfer_note)
  returning id into v_order_id;

  insert into public.order_items (order_id, skill_id, skill_title, unit_amount)
  select v_order_id, s.id, s.title,
    case when p_combo_size is null then s.activation_price_vnd else 0 end
  from public.skills s
  where s.slug in (select distinct unnest(p_skill_slugs))
    and s.status = 'published'
  order by s.sort_order, s.title;

  if p_combo_size = 10 then
    insert into public.order_items (order_id, skill_id, skill_title, unit_amount)
    values (v_order_id, null, 'Quà tặng: ChatGPT Plus 1 tháng', 0);
  end if;

  return query
  select v_order_id, p_order_code, v_total_amount, v_transfer_note, v_selected_count;
end;
$$;

revoke execute on function public.create_pending_order(text[], text, integer) from public;
grant execute on function public.create_pending_order(text[], text, integer) to anon, authenticated;
