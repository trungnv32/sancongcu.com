alter table public.wallet_topups add column if not exists credited_amount_vnd integer;
update public.wallet_topups set credited_amount_vnd = amount_vnd where credited_amount_vnd is null;
alter table public.wallet_topups alter column credited_amount_vnd set not null;

create or replace function public.create_wallet_topup(p_amount_vnd integer)
returns public.wallet_topups language plpgsql security definer set search_path = public as $$
declare v_wallet public.wallets%rowtype; v_topup public.wallet_topups%rowtype; v_code text; v_credit integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_amount_vnd < 5000 or p_amount_vnd > 50000000 then raise exception 'INVALID_AMOUNT'; end if;
  select * into v_wallet from public.wallets where user_id = auth.uid(); if not found then raise exception 'WALLET_NOT_FOUND'; end if;
  v_credit := case p_amount_vnd when 100000 then 110000 when 200000 then 250000 when 500000 then 750000 else p_amount_vnd end;
  v_code := 'NAP' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.wallet_topups (user_id, wallet_id, amount_vnd, credited_amount_vnd, transfer_code) values (auth.uid(), v_wallet.id, p_amount_vnd, v_credit, v_code) returning * into v_topup;
  return v_topup;
end; $$;

create or replace function public.confirm_wallet_topup(p_topup_id uuid)
returns public.wallet_topups language plpgsql security definer set search_path = public, private as $$
declare v_topup public.wallet_topups%rowtype;
begin
  if not private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_topup from public.wallet_topups where id = p_topup_id for update;
  if not found then raise exception 'TOPUP_NOT_FOUND'; end if;
  if v_topup.status = 'confirmed' then return v_topup; end if;
  if v_topup.status <> 'pending' then raise exception 'TOPUP_NOT_PENDING'; end if;
  update public.wallet_topups set status = 'confirmed', confirmed_at = now() where id = p_topup_id returning * into v_topup;
  update public.wallets set balance_vnd = balance_vnd + v_topup.credited_amount_vnd, updated_at = now() where id = v_topup.wallet_id;
  insert into public.wallet_ledger (wallet_id,user_id,entry_type,direction,amount_vnd,reference_type,reference_id,note) values (v_topup.wallet_id,v_topup.user_id,'topup','credit',v_topup.credited_amount_vnd,'wallet_topup',v_topup.id,'Nạp tiền: ' || v_topup.transfer_code || case when v_topup.credited_amount_vnd > v_topup.amount_vnd then ' · ưu đãi +' || (v_topup.credited_amount_vnd-v_topup.amount_vnd)::text || 'đ' else '' end);
  return v_topup;
end; $$;

revoke all on function public.create_wallet_topup(integer) from public, anon;
revoke all on function public.confirm_wallet_topup(uuid) from public, anon;
grant execute on function public.create_wallet_topup(integer) to authenticated;
grant execute on function public.confirm_wallet_topup(uuid) to authenticated;
