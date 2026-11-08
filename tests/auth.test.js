import test from 'node:test';
import assert from 'node:assert/strict';
import { readAuthConfig } from '../src/cabinet/auth/config.js';
import { loadIdentity, canAccess } from '../src/cabinet/auth/session.js';
import { authError } from '../src/cabinet/auth/errors.js';
const config = { VITE_APP_MODE: 'live', VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' };
const jwt = role => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;

test('auth configuration rejects missing settings, secret keys and unsafe URLs', () => {
  assert.equal(readAuthConfig(config).error, null);
  assert.equal(readAuthConfig(config).smsEnabled, false);
  assert.equal(readAuthConfig({}).error, 'missing_config');
  for (const key of ['sb_secret_private', jwt('service_role'), 'broken']) assert.equal(readAuthConfig({ ...config, VITE_SUPABASE_PUBLISHABLE_KEY: key }).error, 'unsafe_key');
  assert.equal(readAuthConfig({ ...config, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }).error, null);
  for (const url of ['http://example.com', 'https://user:password@example.com', 'https://example.com/path', 'javascript:alert(1)']) assert.equal(readAuthConfig({ ...config, VITE_SUPABASE_URL: url }).error, 'invalid_url');
  assert.equal(readAuthConfig({ ...config, VITE_APP_MODE: 'typo' }).error, 'invalid_mode');
});
const user = { id: 'owner', phone_confirmed_at: '2026-01-01', user_metadata: { role: 'admin' } };
function client(profile, account = user) {
  return { auth: { getUser: async () => ({ data: { user: account } }) }, from: table => {
    assert.equal(table, 'profiles');
    return { select: () => ({ eq: (column, id) => { assert.equal(column, 'id'); assert.equal(id, account.id); return { maybeSingle: async () => ({ data: profile }) }; } }) };
  } };
}
test('identity requires server verification and the matching database role, ignoring forged metadata', async () => {
  const identity = await loadIdentity(client({ id: 'owner', role: 'user' }), { access_token: 'fixture' });
  assert.equal(canAccess(identity, 'admin'), false);
  assert.equal(canAccess(identity, 'user'), true);
  assert.equal((await loadIdentity(null, null)).status, 'signedOut');
  assert.equal((await loadIdentity(client(null, { id: 'owner' }), { access_token: 'fixture' })).status, 'unverified');
  for (const profile of [null, { id: 'other', role: 'admin' }, { id: 'owner', role: 'unknown' }]) await assert.rejects(loadIdentity(client(profile), { access_token: 'fixture' }));
  await assert.rejects(loadIdentity({ auth: { getUser: async () => ({ error: new Error('bad token') }) } }, { access_token: 'fixture' }));
});
test('public errors are translated and do not expose raw backend details', () => {
  assert.match(authError({ code: 'invalid_credentials' }), /noto‘g‘ri/);
  assert.match(authError({ code: 'otp_expired' }), /muddati/);
  assert.doesNotMatch(authError(new Error('private database connection detail')), /private|database|connection/);
});
