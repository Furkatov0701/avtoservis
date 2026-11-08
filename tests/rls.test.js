import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL profile policies isolate accounts and deny client privilege escalation', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users (id uuid primary key, raw_user_meta_data jsonb, phone_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon, service_role;
      grant execute on function auth.uid() to authenticated;`);
    await db.exec(await readFile(new URL('../supabase/migrations/202611060001_profiles_and_roles.sql', import.meta.url), 'utf8'));
    await db.query(`insert into auth.users values ($1, '{"first_name":"Ali","last_name":"Valiyev","role":"admin"}', now()), ($2, '{"first_name":"Other"}', now())`, [owner, other]);
    assert.equal((await db.query('select role from profiles where id=$1', [owner])).rows[0].role, 'user');
    async function asUser(sql, params = [], role = 'authenticated') {
      await db.exec('begin');
      try {
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [owner]);
        await db.exec(`set local role ${role}`);
        return await db.query(sql, params);
      } finally { await db.exec('rollback'); }
    }
    assert.deepEqual((await asUser('select id from profiles')).rows, [{ id: owner }]);
    assert.equal((await asUser('update profiles set first_name=$1 where id=$2 returning first_name', ['Changed', owner])).rows[0].first_name, 'Changed');
    assert.equal((await asUser('update profiles set first_name=$1 where id=$2 returning id', ['Stolen', other])).rows.length, 0);
    for (const query of ["update profiles set role='admin'", "update profiles set id='00000000-0000-4000-8000-000000000003'", 'delete from profiles', 'insert into profiles(id) values (gen_random_uuid())', 'select avto_create_profile()']) await assert.rejects(asUser(query), /permission denied/);
    await assert.rejects(asUser('select * from profiles', [], 'anon'), /permission denied/);
    // The initial admin script only accepts a verified user and can run once.
    const bootstrap = (await readFile(new URL('../supabase/bootstrap-admin.sql', import.meta.url), 'utf8')).replace(/^\\set.*\n/m, '').replace(/:'admin_user_id'/, `'${owner}'`);
    await db.exec(`update auth.users set phone_confirmed_at=null where id='${owner}'`);
    await assert.rejects(db.exec(bootstrap), /verified phone/); await db.exec('rollback');
    await db.exec(`update auth.users set phone_confirmed_at=now() where id='${owner}'`);
    await db.exec(bootstrap);
    assert.equal((await db.query('select role from profiles where id=$1', [owner])).rows[0].role, 'admin');
    await assert.rejects(db.exec(bootstrap), /admin already exists/); await db.exec('rollback');
    // An admin is still an authenticated browser caller, not a database superuser.
    await assert.rejects(asUser("update profiles set role='user'"), /permission denied/);
    assert.deepEqual((await asUser('select id from profiles')).rows, [{ id: owner }]);
  } finally { await db.close(); }
});
