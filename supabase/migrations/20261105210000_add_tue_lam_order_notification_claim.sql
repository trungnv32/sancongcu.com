alter table public.orders
  add column if not exists tue_lam_telegram_notified_at timestamptz;
