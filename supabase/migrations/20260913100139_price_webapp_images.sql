-- Charge Webapp generation by the requested number of output images.
-- Logo-enabled images use the fixed 6.000đ price per image.
drop function if exists public.webapp_start_job(uuid, uuid, jsonb, text);

create function public.webapp_start_job(
  p_user_id uuid,
  p_skill_id uuid,
  p_input_paths jsonb,
  p_instruction text default '',
  p_output_count integer default 1,
  p_has_logo boolean default false
)
returns public.webapp_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skill public.skills%rowtype;
  v_wallet public.wallets%rowtype;
  v_unit_price integer;
  v_price integer;
  v_output_count integer;
  v_job public.webapp_jobs%rowtype;
begin
  select * into v_skill from public.skills
    where id = p_skill_id and status = 'published' and webapp_enabled = true;
  if not found then raise exception 'WEBAPP_UNAVAILABLE'; end if;
  if jsonb_typeof(p_input_paths) <> 'array' or jsonb_array_length(p_input_paths) < 1 then
    raise exception 'INPUT_REQUIRED';
  end if;

  v_output_count := greatest(1, least(4, coalesce(p_output_count, 1)));
  v_unit_price := case when coalesce(p_has_logo, false) then 6000
    else greatest(0, coalesce((v_skill.webapp_config ->> 'price_vnd')::integer, 15000))
  end;
  v_price := v_unit_price * v_output_count;

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

revoke all on function public.webapp_start_job(uuid, uuid, jsonb, text, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.webapp_start_job(uuid, uuid, jsonb, text, integer, boolean)
  to service_role;
