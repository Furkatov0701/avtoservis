-- Staff access is separate from Telegram identity. A Telegram profile becomes
-- an administrator only when an existing administrator explicitly adds it here.
begin;

create table public.service_staff (
  telegram_user_id bigint primary key references public.telegram_profiles(telegram_user_id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table public.service_staff enable row level security;
revoke all on table public.service_staff from anon, authenticated;
grant all on table public.service_staff to service_role;

commit;
