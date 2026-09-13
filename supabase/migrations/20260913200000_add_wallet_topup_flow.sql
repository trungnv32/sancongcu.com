create or replace function public.create_wallet_topup(p_amount_vnd integer)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare v_wallet public.wallets%rowtype; v_topup public.wallet_topups%rowtype; v_code text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_amount_vnd < 5000 or p_amount_vnd > 50000000 then raise exception 'INVALID_AMOUNT'; end if;
  select * into v_wallet from public.wallets where user_id = auth.uid();
  if not found then raise exception 'WALLET_NOT_FOUND'; end if;
  v_code := 'NAP' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.wallet_topups (user_id, wallet_id, amount_vnd, transfer_code)
    values (auth.uid(), v_wallet.id, p_amount_vnd, v_code) returning * into v_topup;
  return v_topup;
end;
$$;

create or replace function public.confirm_wallet_topup(p_topup_id uuid)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public, private
as $$
declare v_topup public.wallet_topups%rowtype;
begin
  if not private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_topup from public.wallet_topups where id = p_topup_id for update;
  if not found then raise exception 'TOPUP_NOT_FOUND'; end if;
  if v_topup.status = 'confirmed' then return v_topup; end if;
  if v_topup.status <> 'pending' then raise exception 'TOPUP_NOT_PENDING'; end if;
  update public.wallet_topups set status = 'confirmed', confirmed_at = now() where id = p_topup_id returning * into v_topup;
  update public.wallets set balance_vnd = balance_vnd + v_topup.amount_vnd, updated_at = now() where id = v_topup.wallet_id;
  insert into public.wallet_ledger (wallet_id, user_id, entry_type, direction, amount_vnd, reference_type, reference_id, note)
    values (v_topup.wallet_id, v_topup.user_id, 'topup', 'credit', v_topup.amount_vnd, 'wallet_topup', v_topup.id, 'Nạp tiền: ' || v_topup.transfer_code);
  return v_topup;
end;
$$;

drop policy if exists "Admins manage wallet topups" on public.wallet_topups;
create policy "Admins manage wallet topups" on public.wallet_topups
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

revoke all on function public.create_wallet_topup(integer) from public, anon;
grant execute on function public.create_wallet_topup(integer) to authenticated;
revoke all on function public.confirm_wallet_topup(uuid) from public, anon;
grant execute on function public.confirm_wallet_topup(uuid) to authenticated;
