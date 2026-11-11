-- Telegram contact linking.
-- A customer added by an administrator is linked to a Telegram account only
-- when that account shares its own verified phone number with the bot. Phone
-- numbers may have been typed in different formats, so matching uses a
-- read-only normalized copy. Existing rows are not modified or deleted.
begin;

alter table public.customers
  add column if not exists phone_normalized text generated always as (
    case
      when regexp_replace(phone, '\D', '', 'g') ~ '^[0-9]{9}$' then '998' || regexp_replace(phone, '\D', '', 'g')
      else regexp_replace(phone, '\D', '', 'g')
    end
  ) stored;

create index if not exists customers_phone_normalized_idx on public.customers(phone_normalized) where phone_normalized <> '';

commit;
