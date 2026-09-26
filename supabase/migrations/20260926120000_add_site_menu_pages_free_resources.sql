create table if not exists public.site_menu_items (
  id text primary key,
  label text not null check (char_length(label) <= 80),
  href text not null check (char_length(href) <= 200),
  parent_id text null references public.site_menu_items(id) on delete cascade,
  description text not null default '' check (char_length(description) <= 300),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_pages (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  menu_label text not null check (char_length(menu_label) <= 80),
  eyebrow text not null default '' check (char_length(eyebrow) <= 120),
  title text not null check (char_length(title) <= 220),
  summary text not null default '' check (char_length(summary) <= 700),
  content_blocks text[] not null default '{}',
  cta_label text not null default '' check (char_length(cta_label) <= 100),
  cta_href text not null default '' check (char_length(cta_href) <= 220),
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.free_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 180),
  description text not null default '' check (char_length(description) <= 700),
  file_url text not null default '',
  file_name text not null default '' check (char_length(file_name) <= 220),
  sort_order integer not null default 0,
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('free-resources', 'free-resources', true)
on conflict (id) do nothing;

alter table public.site_menu_items enable row level security;
alter table public.site_pages enable row level security;
alter table public.free_resources enable row level security;

drop policy if exists "Anyone can read visible menu items" on public.site_menu_items;
create policy "Anyone can read visible menu items"
  on public.site_menu_items
  for select
  to anon, authenticated
  using (is_visible = true);

drop policy if exists "Admins manage menu items" on public.site_menu_items;
create policy "Admins manage menu items"
  on public.site_menu_items
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Anyone can read visible site pages" on public.site_pages;
create policy "Anyone can read visible site pages"
  on public.site_pages
  for select
  to anon, authenticated
  using (is_visible = true);

drop policy if exists "Admins manage site pages" on public.site_pages;
create policy "Admins manage site pages"
  on public.site_pages
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Anyone can read visible free resources" on public.free_resources;
create policy "Anyone can read visible free resources"
  on public.free_resources
  for select
  to anon, authenticated
  using (is_visible = true);

drop policy if exists "Admins manage free resources" on public.free_resources;
create policy "Admins manage free resources"
  on public.free_resources
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Anyone can download free resource files" on storage.objects;
create policy "Anyone can download free resource files"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'free-resources');

drop policy if exists "Admins upload free resource files" on storage.objects;
create policy "Admins upload free resource files"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'free-resources' and private.is_admin());

drop policy if exists "Admins update free resource files" on storage.objects;
create policy "Admins update free resource files"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'free-resources' and private.is_admin())
  with check (bucket_id = 'free-resources' and private.is_admin());

insert into public.site_menu_items (id, label, href, parent_id, description, sort_order, is_visible)
values
  ('about', 'Về chúng tôi', '#ve-chung-toi', null, '', 1, true),
  ('services', 'Dịch vụ', '#dich-vu', null, '', 2, true),
  ('training', 'Khoá huấn luyện', '#khoa-huan-luyen', null, '', 3, true),
  ('free-resources', 'Quà tặng miễn phí', '/tai-nguyen-mien-phi', null, '', 4, true),
  ('service-inhouse', 'Đào tạo AI in-house', '#dich-vu', 'services', 'Đào tạo đội ngũ cách sử dụng và ứng dụng AI vào công việc thực tế.', 1, true),
  ('service-coaching', 'Đào tạo nhóm nhỏ / coaching', '#dich-vu', 'services', 'Kèm nhóm nhỏ hoặc coaching ngắn hạn để giải quyết mục tiêu cụ thể.', 2, true),
  ('service-website', 'Làm website bán hàng', '#dich-vu', 'services', 'Xây website bán hàng gọn, rõ thông điệp và dễ triển khai chiến dịch.', 3, true),
  ('service-workflow', 'Xây workflow công việc', '#dich-vu', 'services', 'Thiết kế luồng làm việc cho doanh nghiệp, đội nhóm hoặc cá nhân.', 4, true),
  ('service-chatbot', 'Chatbot CSKH / tuyển dụng', '#dich-vu', 'services', 'Xây chatbot chăm sóc khách hàng, tuyển dụng và onboarding nhân sự.', 5, true)
on conflict (id) do nothing;

insert into public.site_pages
  (id, slug, menu_label, eyebrow, title, summary, content_blocks, cta_label, cta_href, is_visible, sort_order)
values
  (
    'about',
    've-chung-toi',
    'Về chúng tôi',
    'Về sancongcu.com',
    'Nơi tập hợp công cụ AI thực dụng cho công việc hàng ngày',
    'Sancongcu.com giúp bạn tìm đúng công cụ cho đúng việc: bán hàng, nội dung, hình ảnh, video, đào tạo, chăm sóc khách hàng và tự động hóa quy trình.',
    array[
      'Chúng tôi chọn lọc và đóng gói các công cụ mới, thực dụng và dễ áp dụng để bạn có thể dùng ngay trong công việc hằng ngày.',
      'Các công cụ được phân chia theo mục đích và ngành nghề cụ thể, giúp người mới cũng dễ tìm được điểm bắt đầu phù hợp.',
      'Ngoài các công cụ trả phí, sancongcu.com còn có kho tài nguyên miễn phí để bạn thử nghiệm và học cách ứng dụng AI.',
      'Nếu bạn có kinh nghiệm, quy trình hoặc công cụ riêng, bạn có thể hợp tác cùng chúng tôi để đóng gói và bán trên sancongcu.com.'
    ],
    'Khám phá công cụ',
    '#danh-muc-1',
    true,
    1
  ),
  (
    'training',
    'khoa-huan-luyen',
    'Khoá huấn luyện',
    'Học từ con số 0',
    'Hướng dẫn sử dụng AI đến khi tạo được sản phẩm thực tế',
    'Lộ trình dành cho người mới: hiểu AI, dùng đúng công cụ, tạo sản phẩm, tối ưu kinh doanh và mở thêm nguồn thu từ dịch vụ AI.',
    array[
      'Khóa huấn luyện bắt đầu từ nền tảng rất dễ hiểu: AI có thể làm gì, nên dùng trong việc nào và cách đặt yêu cầu để nhận kết quả tốt.',
      'Bạn sẽ thực hành trên các tình huống thật như viết nội dung bán hàng, tạo hình ảnh, dựng video, xây landing page, thiết kế chatbot và sắp xếp workflow.',
      'Mục tiêu không chỉ là biết dùng công cụ, mà là biết biến AI thành trợ lý làm việc, tạo ra sản phẩm cụ thể hoặc dịch vụ có thể bán cho khách hàng.'
    ],
    'Nhận tư vấn lộ trình',
    'https://zalo.me/0938069668',
    true,
    3
  ),
  (
    'free-resources',
    'tai-nguyen-mien-phi',
    'Quà tặng miễn phí',
    'Kho tài nguyên miễn phí',
    'Tải tài liệu, mẫu prompt và file hướng dẫn miễn phí',
    'Một trang riêng để bạn đăng các tài nguyên miễn phí cho khách hàng tải về, dùng thử và quay lại khám phá các công cụ phù hợp hơn.',
    array[
      'Bạn có thể đăng checklist, file mẫu, bộ prompt, tài liệu hướng dẫn, bảng tính hoặc tài nguyên dùng thử để khách tải về.',
      'Mỗi tài nguyên nên có tên rõ ràng, mô tả ngắn về lợi ích và file tải trực tiếp để khách dễ chọn đúng thứ họ cần.'
    ],
    'Xem kho tài nguyên',
    '/tai-nguyen-mien-phi',
    true,
    4
  )
on conflict (id) do nothing;
