-- Stage 3 only: account profiles. No customer/car/service tables yet.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (first_name, last_name) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

create policy profiles_read_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function public.avto_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, first_name, last_name, role)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), 80),
    left(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), 80),
    'user'
  );
  return new;
end;
$$;
revoke all on function public.avto_create_profile() from public, anon, authenticated;
create trigger avto_auth_user_created after insert on auth.users
  for each row execute function public.avto_create_profile();

create function public.avto_touch_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.avto_touch_profile() from public, anon, authenticated;
create trigger avto_profile_updated before update on public.profiles
  for each row execute function public.avto_touch_profile();

-- Existing Auth users are preserved. Metadata never supplies an admin role.
insert into public.profiles (id, first_name, last_name, role)
select id,
  left(trim(coalesce(raw_user_meta_data->>'first_name', '')), 80),
  left(trim(coalesce(raw_user_meta_data->>'last_name', '')), 80),
  'user'
from auth.users on conflict (id) do nothing;

commit;
