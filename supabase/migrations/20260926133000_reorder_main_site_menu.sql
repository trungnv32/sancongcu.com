update public.site_menu_items
set label = case id
    when 'free-resources' then 'Kho miễn phí'
    else label
  end,
  sort_order = case id
    when 'about' then 1
    when 'free-resources' then 2
    when 'services' then 3
    when 'training' then 4
    else sort_order
  end,
  updated_at = now()
where id in ('about', 'free-resources', 'services', 'training');

update public.site_pages
set menu_label = 'Kho miễn phí',
    sort_order = 2,
    updated_at = now()
where id = 'free-resources';

update public.site_pages
set sort_order = 4,
    updated_at = now()
where id = 'training';
