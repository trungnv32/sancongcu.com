insert into public.site_pages
  (id, slug, menu_label, eyebrow, title, summary, content_blocks, cta_label, cta_href, is_visible, sort_order)
values
  (
    'services',
    'dich-vu',
    'Dịch vụ',
    'Dịch vụ triển khai',
    'Đưa AI vào công việc theo đúng nhu cầu của bạn',
    'Từ đào tạo, coaching đến xây website, workflow và chatbot, sancongcu.com hỗ trợ bạn biến ý tưởng thành hệ thống có thể dùng trong vận hành thật.',
    array[]::text[],
    '',
    '',
    true,
    3
  )
on conflict (id) do update set
  slug = excluded.slug,
  menu_label = excluded.menu_label,
  eyebrow = excluded.eyebrow,
  title = excluded.title,
  summary = excluded.summary,
  sort_order = excluded.sort_order;
