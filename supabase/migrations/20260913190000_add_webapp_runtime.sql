-- Per-skill runtime settings for pay-per-use Webapps.
alter table public.skills
  add column if not exists webapp_config jsonb not null default jsonb_build_object(
    'price_vnd', 15000,
    'input_limit', 1,
    'output_count', 1,
    'model', 'gpt-image-2',
    'prompt_template', ''
  );

alter table public.webapp_jobs
  add column if not exists instruction text not null default '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('webapp-inputs', 'webapp-inputs', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('webapp-outputs', 'webapp-outputs', false, 15728640, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- These functions are callable only by the trusted Edge Function service role.
create or replace function public.webapp_start_job(
  p_user_id uuid,
  p_skill_id uuid,
  p_input_paths jsonb,
  p_instruction text default ''
)
returns public.webapp_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skill public.skills%rowtype;
  v_wallet public.wallets%rowtype;
  v_price integer;
  v_job public.webapp_jobs%rowtype;
begin
  select * into v_skill from public.skills
    where id = p_skill_id and status = 'published' and webapp_enabled = true;
  if not found then raise exception 'WEBAPP_UNAVAILABLE'; end if;
  if jsonb_typeof(p_input_paths) <> 'array' or jsonb_array_length(p_input_paths) < 1 then
    raise exception 'INPUT_REQUIRED';
  end if;
  v_price := greatest(0, coalesce((v_skill.webapp_config ->> 'price_vnd')::integer, 15000));
  update public.wallets set balance_vnd = balance_vnd - v_price, updated_at = now()
    where user_id = p_user_id and balance_vnd >= v_price
    returning * into v_wallet;
  if not found then raise exception 'INSUFFICIENT_BALANCE'; end if;
  insert into public.webapp_jobs (user_id, skill_id, quoted_amount_vnd, input_paths, instruction)
    values (p_user_id, p_skill_id, v_price, p_input_paths, left(coalesce(p_instruction, ''), 1000))
    returning * into v_job;
  insert into public.wallet_ledger (wallet_id, user_id, entry_type, direction, amount_vnd, reference_type, reference_id, note)
    values (v_wallet.id, p_user_id, 'charge', 'debit', v_price, 'webapp_job', v_job.id, 'Tạo ảnh bằng Webapp');
  return v_job;
end;
$$;

create or replace function public.webapp_complete_job(p_job_id uuid, p_output_paths jsonb)
returns public.webapp_jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.webapp_jobs%rowtype;
begin
  update public.webapp_jobs set status = 'succeeded', output_paths = p_output_paths, completed_at = now()
    where id = p_job_id and status in ('queued', 'running') returning * into v_job;
  if not found then raise exception 'JOB_NOT_ACTIVE'; end if;
  return v_job;
end;
$$;

create or replace function public.webapp_fail_job(p_job_id uuid, p_error text)
returns public.webapp_jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.webapp_jobs%rowtype; v_wallet public.wallets%rowtype;
begin
  select * into v_job from public.webapp_jobs where id = p_job_id for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if v_job.status in ('failed', 'cancelled', 'succeeded') then return v_job; end if;
  update public.webapp_jobs set status = 'failed', error_message = left(coalesce(p_error, 'Không thể tạo ảnh.'), 500), completed_at = now()
    where id = p_job_id returning * into v_job;
  update public.wallets set balance_vnd = balance_vnd + v_job.quoted_amount_vnd, updated_at = now()
    where user_id = v_job.user_id returning * into v_wallet;
  insert into public.wallet_ledger (wallet_id, user_id, entry_type, direction, amount_vnd, reference_type, reference_id, note)
    values (v_wallet.id, v_job.user_id, 'refund', 'credit', v_job.quoted_amount_vnd, 'webapp_job', v_job.id, 'Hoàn tiền do tạo ảnh không thành công');
  return v_job;
end;
$$;

revoke all on function public.webapp_start_job(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.webapp_complete_job(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.webapp_fail_job(uuid, text) from public, anon, authenticated;
grant execute on function public.webapp_start_job(uuid, uuid, jsonb, text), public.webapp_complete_job(uuid, jsonb), public.webapp_fail_job(uuid, text) to service_role;
