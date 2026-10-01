create table if not exists public.sepay_transactions (
  id uuid primary key default gen_random_uuid(),
  sepay_id text,
  reference_code text,
  gateway text,
  account_number text,
  transfer_type text not null,
  transfer_amount integer not null check (transfer_amount >= 0),
  transaction_date timestamptz,
  content text not null default '',
  matched_code text,
  matched_type text check (matched_type in ('order', 'wallet_topup', 'unmatched')),
  order_id uuid references public.orders(id) on delete set null,
  wallet_topup_id uuid references public.wallet_topups(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists sepay_transactions_sepay_id_uidx
  on public.sepay_transactions (sepay_id)
  where sepay_id is not null and sepay_id <> '';

create unique index if not exists sepay_transactions_reference_code_uidx
  on public.sepay_transactions (reference_code)
  where reference_code is not null and reference_code <> '';

create index if not exists sepay_transactions_matched_code_idx
  on public.sepay_transactions (matched_code);

alter table public.sepay_transactions enable row level security;

create policy "Admins read SePay transactions"
  on public.sepay_transactions
  for select
  to authenticated
  using (private.is_admin());

create or replace function public.process_sepay_webhook(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sepay_id text := nullif(p_payload ->> 'id', '');
  v_reference_code text := nullif(p_payload ->> 'referenceCode', '');
  v_gateway text := nullif(p_payload ->> 'gateway', '');
  v_account_number text := nullif(p_payload ->> 'accountNumber', '');
  v_transfer_type text := coalesce(nullif(lower(p_payload ->> 'transferType'), ''), '');
  v_transfer_amount integer := case
    when coalesce(p_payload ->> 'transferAmount', '') ~ '^[0-9]+$'
      then (p_payload ->> 'transferAmount')::integer
    else 0
  end;
  v_content text := coalesce(p_payload ->> 'content', '');
  v_transaction_date timestamptz;
  v_transaction_id uuid;
  v_order public.orders%rowtype;
  v_topup public.wallet_topups%rowtype;
  v_code text;
  v_matched_type text := 'unmatched';
  v_pg_amount integer;
  v_order_found boolean;
begin
  begin
    v_transaction_date := nullif(p_payload ->> 'transactionDate', '')::timestamptz;
  exception when others then
    v_transaction_date := null;
  end;

  if p_payload ->> 'notification_type' = 'ORDER_PAID' then
    v_reference_code := coalesce(
      nullif(p_payload #>> '{transaction,transaction_id}', ''),
      nullif(p_payload #>> '{transaction,id}', ''),
      v_reference_code
    );
    v_content := coalesce(
      nullif(p_payload #>> '{order,order_description}', ''),
      nullif(p_payload #>> '{order,order_invoice_number}', ''),
      ''
    );
    v_pg_amount := case
      when coalesce(p_payload #>> '{transaction,transaction_amount}', '') ~ '^[0-9]+(\.[0-9]+)?$'
        then floor((p_payload #>> '{transaction,transaction_amount}')::numeric)::integer
      when coalesce(p_payload #>> '{order,order_amount}', '') ~ '^[0-9]+(\.[0-9]+)?$'
        then floor((p_payload #>> '{order,order_amount}')::numeric)::integer
      else 0
    end;
    v_code := upper((regexp_match(
      upper(coalesce(p_payload #>> '{order,order_invoice_number}', '') || ' ' || v_content),
      '(SC[A-Z0-9]{8,16})'
    ))[1]);

    if v_code is null then
      insert into public.sepay_transactions (
        sepay_id, reference_code, gateway, account_number, transfer_type, transfer_amount,
        transaction_date, content, matched_type, raw_payload, processed_at
      )
      values (
        nullif(p_payload #>> '{order,id}', ''), v_reference_code, 'SePay PG', null, 'payment_gateway',
        v_pg_amount, null, v_content, 'unmatched', p_payload, now()
      )
      on conflict do nothing;

      return jsonb_build_object('ok', true, 'action', 'ignored', 'reason', 'no_order_code');
    end if;

    select * into v_order
    from public.orders
    where order_code = v_code
    for update;
    v_order_found := found;

    insert into public.sepay_transactions (
      sepay_id, reference_code, gateway, account_number, transfer_type, transfer_amount,
      transaction_date, content, matched_code, matched_type, order_id, raw_payload
    )
    values (
      nullif(p_payload #>> '{order,id}', ''), v_reference_code, 'SePay PG', null, 'payment_gateway',
      v_pg_amount, null, v_content, v_code, case when v_order_found then 'order' else 'unmatched' end,
      case when v_order_found then v_order.id else null end, p_payload
    )
    on conflict do nothing
    returning id into v_transaction_id;

    if v_transaction_id is null then
      return jsonb_build_object('ok', true, 'action', 'duplicate', 'code', v_code);
    end if;

    if not v_order_found then
      update public.sepay_transactions set processed_at = now() where id = v_transaction_id;
      return jsonb_build_object('ok', true, 'action', 'ignored', 'reason', 'order_not_found', 'code', v_code);
    end if;

    if v_order.status = 'pending' and v_pg_amount >= v_order.total_amount then
      update public.orders
      set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
      where id = v_order.id;

      update public.sepay_transactions set processed_at = now() where id = v_transaction_id;
      return jsonb_build_object('ok', true, 'action', 'confirmed_order', 'code', v_code);
    end if;

    update public.sepay_transactions set processed_at = now() where id = v_transaction_id;
    return jsonb_build_object(
      'ok', true,
      'action', 'ignored',
      'reason', case when v_order.status <> 'pending' then 'order_not_pending' else 'amount_not_enough' end,
      'code', v_code
    );
  end if;

  if v_transfer_type <> 'in' then
    insert into public.sepay_transactions (
      sepay_id, reference_code, gateway, account_number, transfer_type, transfer_amount,
      transaction_date, content, matched_type, raw_payload, processed_at
    )
    values (
      v_sepay_id, v_reference_code, v_gateway, v_account_number, v_transfer_type,
      v_transfer_amount, v_transaction_date, v_content, v_matched_type, p_payload, now()
    )
    on conflict do nothing
    returning id into v_transaction_id;

    return jsonb_build_object('ok', true, 'action', 'ignored', 'reason', 'not_incoming');
  end if;

  v_code := upper((regexp_match(upper(v_content), '(SC[A-Z0-9]{8,16}|NAP[A-Z0-9]{10})'))[1]);

  if v_code is null then
    insert into public.sepay_transactions (
      sepay_id, reference_code, gateway, account_number, transfer_type, transfer_amount,
      transaction_date, content, matched_type, raw_payload, processed_at
    )
    values (
      v_sepay_id, v_reference_code, v_gateway, v_account_number, v_transfer_type,
      v_transfer_amount, v_transaction_date, v_content, v_matched_type, p_payload, now()
    )
    on conflict do nothing
    returning id into v_transaction_id;

    return jsonb_build_object('ok', true, 'action', 'ignored', 'reason', 'no_code');
  end if;

  if v_code like 'SC%' then
    select * into v_order
    from public.orders
    where order_code = v_code
    for update;

    if not found then
      insert into public.sepay_transactions (
        sepay_id, reference_code, gateway, account_number, transfer_type, transfer_amount,
        transaction_date, content, matched_code, matched_type, raw_payload, processed_at
      )
      values (
        v_sepay_id, v_reference_code, v_gateway, v_account_number, v_transfer_type,
        v_transfer_amount, v_transaction_date, v_content, v_code, 'unmatched', p_payload, now()
      )
      on conflict do nothing;

      return jsonb_build_object('ok', true, 'action', 'ignored', 'reason', 'order_not_found', 'code', v_code);
    end if;

    insert into public.sepay_transactions (
      sepay_id, reference_code, gateway, account_number, transfer_type, transfer_amount,
      transaction_date, content, matched_code, matched_type, order_id, raw_payload
    )
    values (
      v_sepay_id, v_reference_code, v_gateway, v_account_number, v_transfer_type,
      v_transfer_amount, v_transaction_date, v_content, v_code, 'order', v_order.id, p_payload
    )
    on conflict do nothing
    returning id into v_transaction_id;

    if v_transaction_id is null then
      return jsonb_build_object('ok', true, 'action', 'duplicate', 'code', v_code);
    end if;

    if v_order.status = 'pending' and v_transfer_amount >= v_order.total_amount then
      update public.orders
      set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
      where id = v_order.id;

      update public.sepay_transactions
      set processed_at = now()
      where id = v_transaction_id;

      return jsonb_build_object('ok', true, 'action', 'confirmed_order', 'code', v_code);
    end if;

    update public.sepay_transactions
    set processed_at = now()
    where id = v_transaction_id;

    return jsonb_build_object(
      'ok', true,
      'action', 'ignored',
      'reason', case when v_order.status <> 'pending' then 'order_not_pending' else 'amount_not_enough' end,
      'code', v_code
    );
  end if;

  if v_code like 'NAP%' then
    select * into v_topup
    from public.wallet_topups
    where transfer_code = v_code
    for update;

    if not found then
      insert into public.sepay_transactions (
        sepay_id, reference_code, gateway, account_number, transfer_type, transfer_amount,
        transaction_date, content, matched_code, matched_type, raw_payload, processed_at
      )
      values (
        v_sepay_id, v_reference_code, v_gateway, v_account_number, v_transfer_type,
        v_transfer_amount, v_transaction_date, v_content, v_code, 'unmatched', p_payload, now()
      )
      on conflict do nothing;

      return jsonb_build_object('ok', true, 'action', 'ignored', 'reason', 'topup_not_found', 'code', v_code);
    end if;

    insert into public.sepay_transactions (
      sepay_id, reference_code, gateway, account_number, transfer_type, transfer_amount,
      transaction_date, content, matched_code, matched_type, wallet_topup_id, raw_payload
    )
    values (
      v_sepay_id, v_reference_code, v_gateway, v_account_number, v_transfer_type,
      v_transfer_amount, v_transaction_date, v_content, v_code, 'wallet_topup', v_topup.id, p_payload
    )
    on conflict do nothing
    returning id into v_transaction_id;

    if v_transaction_id is null then
      return jsonb_build_object('ok', true, 'action', 'duplicate', 'code', v_code);
    end if;

    if v_topup.status = 'pending' and v_transfer_amount >= v_topup.amount_vnd then
      update public.wallet_topups
      set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
      where id = v_topup.id
      returning * into v_topup;

      update public.wallets
      set balance_vnd = balance_vnd + v_topup.credited_amount_vnd,
          updated_at = now()
      where id = v_topup.wallet_id;

      insert into public.wallet_ledger (
        wallet_id, user_id, entry_type, direction, amount_vnd, reference_type, reference_id, note
      )
      values (
        v_topup.wallet_id,
        v_topup.user_id,
        'topup',
        'credit',
        v_topup.credited_amount_vnd,
        'wallet_topup',
        v_topup.id,
        'SePay tự xác nhận: ' || v_topup.transfer_code ||
          case
            when v_topup.credited_amount_vnd > v_topup.amount_vnd
              then ' · ưu đãi +' || (v_topup.credited_amount_vnd - v_topup.amount_vnd)::text || 'đ'
            else ''
          end
      );

      update public.sepay_transactions
      set processed_at = now()
      where id = v_transaction_id;

      return jsonb_build_object('ok', true, 'action', 'confirmed_topup', 'code', v_code);
    end if;

    update public.sepay_transactions
    set processed_at = now()
    where id = v_transaction_id;

    return jsonb_build_object(
      'ok', true,
      'action', 'ignored',
      'reason', case when v_topup.status <> 'pending' then 'topup_not_pending' else 'amount_not_enough' end,
      'code', v_code
    );
  end if;

  return jsonb_build_object('ok', true, 'action', 'ignored', 'reason', 'unsupported_code', 'code', v_code);
end;
$$;

revoke all on function public.process_sepay_webhook(jsonb) from public, anon, authenticated;
grant execute on function public.process_sepay_webhook(jsonb) to service_role;
