alter table public.free_resources
  add column if not exists thumbnail_url text not null default '';
