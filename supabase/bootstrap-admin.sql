-- Run once from a trusted PostgreSQL owner connection, never from the browser.
-- psql "$DATABASE_URL" -v admin_user_id='verified-auth-user-uuid' -f supabase/bootstrap-admin.sql
\set ON_ERROR_STOP on
begin;
select set_config('avto.bootstrap_admin_id', :'admin_user_id', true);
lock table public.profiles in share row exclusive mode;
do $$
declare target_id uuid := current_setting('avto.bootstrap_admin_id')::uuid;
begin
  if exists(select 1 from public.profiles where role = 'admin') then
    raise exception 'An admin already exists. Bootstrap is only for the first admin.';
  end if;
  if not exists(select 1 from auth.users where id = target_id and phone_confirmed_at is not null) then
    raise exception 'The target Auth user must exist and have a verified phone.';
  end if;
  update public.profiles set role = 'admin' where id = target_id;
  if not found then raise exception 'Profile missing. Apply the profile migration first.'; end if;
end;
$$;
commit;
