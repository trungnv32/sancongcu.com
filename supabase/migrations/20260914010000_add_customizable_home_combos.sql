create table if not exists public.combo_sections (
  id text primary key,
  eyebrow text not null default 'Chọn nhanh theo mục tiêu',
  title text not null check (char_length(title) <= 180),
  description text not null check (char_length(description) <= 500),
  is_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.combos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null default 'Combo',
  title text not null check (char_length(title) <= 180),
  description text not null check (char_length(description) <= 700),
  includes text not null default '' check (char_length(includes) <= 300),
  page_title text not null default '' check (char_length(page_title) <= 180),
  page_description text not null default '' check (char_length(page_description) <= 1200),
  cta_label text not null default 'Khám phá combo →' check (char_length(cta_label) <= 80),
  status text not null default 'published' check (status in ('draft', 'published', 'hidden')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.combo_skills (
  combo_id uuid not null references public.combos(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (combo_id, skill_id)
);

alter table public.combo_sections enable row level security;
alter table public.combos enable row level security;
alter table public.combo_skills enable row level security;

drop policy if exists "Anyone can read combo sections" on public.combo_sections;
create policy "Anyone can read combo sections"
  on public.combo_sections
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage combo sections" on public.combo_sections;
create policy "Admins manage combo sections"
  on public.combo_sections
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Anyone can read published combos" on public.combos;
create policy "Anyone can read published combos"
  on public.combos
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Admins manage combos" on public.combos;
create policy "Admins manage combos"
  on public.combos
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Anyone can read combo skills" on public.combo_skills;
create policy "Anyone can read combo skills"
  on public.combo_skills
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.combos c
      where c.id = combo_skills.combo_id
        and c.status = 'published'
    )
  );

drop policy if exists "Admins manage combo skills" on public.combo_skills;
create policy "Admins manage combo skills"
  on public.combo_skills
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

insert into public.combo_sections (id, eyebrow, title, description, is_visible)
values (
  'home',
  'Chọn nhanh theo mục tiêu',
  'Một lộ trình sẵn sàng để bạn bắt đầu',
  'Không cần tự ghép từng công cụ. Chọn combo phù hợp với công việc kinh doanh đang cần ưu tiên.',
  true
)
on conflict (id) do nothing;

insert into public.combos (slug, label, title, description, includes, page_title, page_description, sort_order, status)
values
  (
    'bat-dau-ban-hang-voi-ai',
    'Combo 01',
    'Combo Bắt đầu bán hàng với AI',
    'Đi từ định vị thương hiệu đến nội dung bán hàng rõ ràng, dễ triển khai.',
    'Thương hiệu · Nội dung · Kịch bản chốt đơn',
    'Combo Bắt đầu bán hàng với AI',
    'Bộ combo giúp bạn xây nền tảng bán hàng với AI: định vị rõ hơn, nội dung dễ dùng hơn và có kịch bản triển khai ban đầu.',
    1,
    'published'
  ),
  (
    'noi-dung-ra-don-moi-ngay',
    'Combo 02',
    'Combo Nội dung ra đơn mỗi ngày',
    'Biến một ý tưởng thành bài viết, hình ảnh và video phục vụ quảng cáo.',
    'Hình ảnh · Video · Quảng cáo',
    'Combo Nội dung ra đơn mỗi ngày',
    'Bộ combo tập trung vào nhịp sản xuất nội dung bán hàng hằng ngày, từ ý tưởng đến hình ảnh, video và quảng cáo.',
    2,
    'published'
  ),
  (
    'toi-uu-chuyen-doi',
    'Combo 03',
    'Combo Tối ưu chuyển đổi',
    'Xây trang bán hàng, ưu đãi và hành trình theo dõi khách hàng nhất quán.',
    'Landing page · Copywriting · Chăm sóc khách hàng',
    'Combo Tối ưu chuyển đổi',
    'Bộ combo dành cho giai đoạn tối ưu điểm chạm bán hàng: offer, nội dung thuyết phục, trang bán hàng và chăm sóc khách.',
    3,
    'published'
  )
on conflict (slug) do nothing;
