-- A Skill can optionally expose a pay-per-use Webapp alongside its installable package.
alter table public.skills
  add column if not exists webapp_enabled boolean not null default false;

comment on column public.skills.webapp_enabled is
  'Whether this Skill has a public Webapp page at /app/:slug.';
