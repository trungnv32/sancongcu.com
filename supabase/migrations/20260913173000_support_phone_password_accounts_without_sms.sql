-- Phone/password accounts are stored as confirmed internal Auth email identities.
-- The customer's phone stays in their profile; no SMS provider or OTP is required.
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    case
      when new.raw_user_meta_data ->> 'phone_number' is not null then null
      else new.email
    end,
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone_number')
  )
  on conflict (user_id) do nothing;

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_customer() from public, anon, authenticated;
