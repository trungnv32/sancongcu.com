-- A pending order is created before showing payment instructions. The transfer
-- note is written in the same INSERT because orders.transfer_note is required.
create or replace function public.create_pending_order(p_skill_slugs text[])
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
  v_order_code text;
  v_transfer_note text;
begin
  if coalesce(cardinality(p_skill_slugs), 0) not between 1 and 20 then
    raise exception 'Cần chọn từ 1 đến 20 Skill.';
  end if;

  select count(*) into v_requested_count
  from (select distinct unnest(p_skill_slugs) as slug) requested;

  select count(*), coalesce(sum(s.activation_price_vnd), 0)
    into v_selected_count, v_total_amount
  from public.skills s
  where s.slug in (select distinct unnest(p_skill_slugs))
    and s.status = 'published';

  if v_selected_count <> v_requested_count then
    raise exception 'Một hoặc nhiều Skill không còn khả dụng.';
  end if;

  v_order_code := 'SC' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_transfer_note := v_order_code || ' ' || v_selected_count || 'SKILL';

  insert into public.orders (order_code, status, currency, total_amount, transfer_note)
  values (v_order_code, 'pending', 'VND', v_total_amount, v_transfer_note)
  returning id into v_order_id;

  insert into public.order_items (order_id, skill_id, skill_title, unit_amount)
  select v_order_id, s.id, s.title, s.activation_price_vnd
  from public.skills s
  where s.slug in (select distinct unnest(p_skill_slugs))
    and s.status = 'published'
  order by s.sort_order, s.title;

  return query
  select v_order_id, v_order_code, v_total_amount, v_transfer_note, v_selected_count;
end;
$$;

revoke all on function public.create_pending_order(text[]) from public;
grant execute on function public.create_pending_order(text[]) to anon, authenticated;
