-- Telegram Mini App identity and the first service data model.
-- The browser never reads these tables directly; the Edge Function verifies
-- Telegram WebApp initData before using the service role on its behalf.
begin;

create extension if not exists pgcrypto;

create table public.telegram_profiles (
  telegram_user_id bigint primary key check (telegram_user_id > 0),
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  username text not null default '' check (char_length(username) <= 32),
  language_code text not null default '' check (char_length(language_code) <= 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint unique references public.telegram_profiles(telegram_user_id) on delete set null,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  phone text not null default '' check (char_length(phone) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  make text not null default '' check (char_length(make) <= 80),
  model text not null check (char_length(model) between 1 and 100),
  plate text not null check (char_length(plate) between 1 and 24),
  production_year smallint check (production_year between 1900 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  service_type text not null check (service_type in ('tires', 'engine_oil', 'antifreeze', 'tint')),
  performed_on date not null,
  next_due_on date,
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  notes text not null default '' check (char_length(notes) <= 2000),
  tire_positions jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (next_due_on is null or next_due_on >= performed_on),
  check (tire_positions is null or (
    jsonb_typeof(tire_positions) = 'object'
    and tire_positions ?& array['front_left', 'front_right', 'rear_left', 'rear_right']
  ))
);

create index customers_telegram_user_id_idx on public.customers(telegram_user_id);
create index vehicles_customer_id_idx on public.vehicles(customer_id);
create index service_records_vehicle_date_idx on public.service_records(vehicle_id, performed_on desc);

create function public.avto_touch_timestamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.avto_touch_timestamp() from public, anon, authenticated;
create trigger avto_telegram_profile_updated before update on public.telegram_profiles
  for each row execute function public.avto_touch_timestamp();
create trigger avto_customer_updated before update on public.customers
  for each row execute function public.avto_touch_timestamp();
create trigger avto_vehicle_updated before update on public.vehicles
  for each row execute function public.avto_touch_timestamp();
create trigger avto_service_record_updated before update on public.service_records
  for each row execute function public.avto_touch_timestamp();

alter table public.telegram_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.service_records enable row level security;

revoke all on table public.telegram_profiles, public.customers, public.vehicles, public.service_records from anon, authenticated;
grant all on table public.telegram_profiles, public.customers, public.vehicles, public.service_records to service_role;

commit;
