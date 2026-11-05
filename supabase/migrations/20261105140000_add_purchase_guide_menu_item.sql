insert into public.site_menu_items
  (id, label, href, parent_id, description, sort_order, is_visible)
values
  (
    'purchase-guide',
    'Hướng dẫn mua hàng',
    '/huong-dan-mua-hang',
    null,
    'Hướng dẫn chọn Skill, combo và thanh toán từng bước.',
    5,
    true
  )
on conflict (id) do update
set label = excluded.label,
    href = excluded.href,
    parent_id = excluded.parent_id,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_visible = excluded.is_visible,
    updated_at = now();
