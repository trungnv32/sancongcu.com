-- The browser creates the transfer code locally so the QR can render before
-- the database request completes. This RPC persists that exact code.
create function public.create_pending_order(p_skill_slugs text[], p_order_code text)
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

  v_transfer_note := p_order_code || ' ' || v_selected_count || 'SKILL';

  insert into public.orders (order_code, status, currency, total_amount, transfer_note)
  values (p_order_code, 'pending', 'VND', v_total_amount, v_transfer_note)
  returning id into v_order_id;

  insert into public.order_items (order_id, skill_id, skill_title, unit_amount)
  select v_order_id, s.id, s.title, s.activation_price_vnd
  from public.skills s
  where s.slug in (select distinct unnest(p_skill_slugs))
    and s.status = 'published'
  order by s.sort_order, s.title;

  return query
  select v_order_id, p_order_code, v_total_amount, v_transfer_note, v_selected_count;
end;
$$;

revoke all on function public.create_pending_order(text[], text) from public;
grant execute on function public.create_pending_order(text[], text) to anon, authenticated;
