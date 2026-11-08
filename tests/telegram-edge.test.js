import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEdgeHandler, deriveWebhookSecret } from '../supabase/functions/_shared/telegram-edge.js';

const token = '123456:' + 'T'.repeat(30); // Deliberately fake, never sent over the network.
const setupSecret = 'setup-fixture-' + 'Z'.repeat(40);
const url = 'https://project.supabase.co/functions/v1/telegram-bot';
const values = { TELEGRAM_BOT_TOKEN: token, SUPABASE_URL: 'https://project.supabase.co', TELEGRAM_SETUP_SECRET: setupSecret, TELEGRAM_MINI_APP_URL: 'https://example.com/app/', TELEGRAM_BOT_USERNAME: 'urgutservis_bot' };
const update = { update_id: 12, message: { text: '/start', from: { id: 123, is_bot: false }, chat: { id: 123, type: 'private' } } };
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
function fixture(overrides = {}, reply) {
  const calls = [];
  const handler = createEdgeHandler({ env: name => ({ ...values, ...overrides })[name], fetcher: async (target, options) => {
    const method = new URL(target).pathname.split('/').at(-1);
    calls.push({ target, method, body: JSON.parse(options.body), redirect: options.redirect });
    if (reply) return reply(method);
    const result = method === 'getMe' ? { is_bot: true, username: 'urgutservis_bot' } : method === 'getWebhookInfo' ? { url, pending_update_count: 0 } : true;
    return json({ ok: true, result });
  } });
  return { handler, calls };
}
function request(body, headers = {}, requestUrl = url) {
  return new Request(requestUrl, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
const adminHeaders = { 'x-avto-setup-secret': setupSecret };

async function signedInitData(user = { id: 456, first_name: 'Ali', username: 'ali' }, authDate = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({ auth_date: String(authDate), query_id: 'query-id', user: JSON.stringify(user) });
  const dataCheckString = [...params].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('\n');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const secret = await crypto.subtle.sign('HMAC', key, encoder.encode(token));
  const checkKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', checkKey, encoder.encode(dataCheckString)));
  params.set('hash', Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(''));
  return params.toString();
}

test('Edge GET reports local configuration without contacting Telegram or exposing a token', async () => {
  const { handler, calls } = fixture();
  const result = await handler(new Request(url));
  assert.equal(result.status, 200);
  const body = await result.text();
  assert.equal(JSON.parse(body).setupEnabled, true); assert.equal(calls.length, 0);
  assert.ok(!body.includes(token) && !body.includes(setupSecret));
  assert.equal((await fixture({ TELEGRAM_BOT_TOKEN: '' }).handler(new Request(url))).status, 503);
});

test('Edge setup requires its own secret; anonymous, JWT-looking and webhook requests cannot configure the bot', async () => {
  const { handler, calls } = fixture();
  for (const headers of [{}, { authorization: 'Bearer fake.service_role.jwt' }, { 'x-avto-setup-secret': 'wrong' }, { 'x-telegram-bot-api-secret-token': setupSecret }]) assert.equal((await handler(request({ action: 'configure' }, headers))).status, 401);
  const disabled = fixture({ TELEGRAM_SETUP_SECRET: '' });
  assert.equal((await disabled.handler(request({ action: 'configure' }, adminHeaders))).status, 401);
  assert.equal(calls.length, 0); assert.equal(disabled.calls.length, 0);
});

test('setup check uses only read-only Telegram calls and returns no raw delivery errors', async () => {
  const { handler, calls } = fixture({}, method => json({ ok: true, result: method === 'getMe' ? { is_bot: true, username: 'urgutservis_bot' } : { url, pending_update_count: 2, last_error_message: `private ${token}` } }));
  const response = await handler(request({ action: 'check' }, adminHeaders));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.webhookMatches, true); assert.equal(data.deliveryErrorPresent, true);
  assert.ok(!JSON.stringify(data).includes(token));
  assert.deepEqual(calls.map(call => call.method), ['getMe', 'getWebhookInfo']);
});

test('configuration uses server URLs and a derived webhook secret, never caller-supplied destinations', async () => {
  const { handler, calls } = fixture();
  const response = await handler(request({ action: 'configure', url: 'https://evil.test', token: 'attacker', drop_pending_updates: true }, adminHeaders, url + '?target=evil'));
  assert.equal(response.status, 200);
  assert.deepEqual(calls.map(call => call.method), ['getMe', 'setMyCommands', 'setChatMenuButton', 'setWebhook']);
  const webhook = calls.at(-1).body;
  assert.equal(webhook.url, url); assert.equal(webhook.drop_pending_updates, false);
  assert.equal(webhook.secret_token, await deriveWebhookSecret(token, url));
  assert.notEqual(webhook.secret_token, token); assert.notEqual(webhook.secret_token, setupSecret);
  assert.equal(calls[2].body.menu_button.web_app.url, values.TELEGRAM_MINI_APP_URL);
  assert.ok(calls.every(call => call.target.startsWith('https://api.telegram.org/bot') && call.redirect === 'error'));
  const result = await response.text(); assert.ok(!result.includes(token) && !result.includes(webhook.secret_token));
});

test('wrong bot identity prevents every configuration mutation', async () => {
  const { handler, calls } = fixture({}, () => json({ ok: true, result: { is_bot: true, username: 'another_bot' } }));
  const response = await handler(request({ action: 'configure' }, adminHeaders));
  assert.equal(response.status, 409); assert.deepEqual(calls.map(call => call.method), ['getMe']);
});

test('missing frontend URL is honest: no Mini App menu or fabricated button', async () => {
  const { handler, calls } = fixture({ TELEGRAM_MINI_APP_URL: '' });
  const configured = await (await handler(request({ action: 'configure' }, adminHeaders))).json();
  assert.equal(configured.miniAppConfigured, false);
  assert.ok(!calls.some(call => call.method === 'setChatMenuButton'));
  const secret = await deriveWebhookSecret(token, url);
  const response = await handler(request(update, { 'x-telegram-bot-api-secret-token': secret }));
  const data = await response.json();
  assert.equal(data.reply_markup, undefined); assert.match(data.text, /tayyorlanmoqda/);
});

test('Edge webhook accepts only its derived secret and supported private updates', async () => {
  const { handler, calls } = fixture();
  const secret = await deriveWebhookSecret(token, url);
  assert.equal((await handler(request(update, { 'x-telegram-bot-api-secret-token': 'wrong' }))).status, 401);
  const response = await handler(request(update, { 'x-telegram-bot-api-secret-token': secret }));
  assert.equal(response.status, 200); assert.equal((await response.json()).reply_markup.inline_keyboard[0][0].web_app.url, values.TELEGRAM_MINI_APP_URL);
  const group = { ...update, message: { ...update.message, chat: { type: 'group', id: -123 } } };
  assert.deepEqual(await (await handler(request(group, { 'x-telegram-bot-api-secret-token': secret }))).json(), { ok: true });
  assert.equal(calls.length, 0);
  const rotated = fixture({ TELEGRAM_BOT_TOKEN: token + 'R' });
  assert.equal((await rotated.handler(request(update, { 'x-telegram-bot-api-secret-token': secret }))).status, 401);
});

test('Edge bounds JSON bodies and rejects invalid paths, methods and setup actions', async () => {
  const { handler, calls } = fixture();
  assert.equal((await handler(new Request(url + '/unexpected'))).status, 404);
  assert.equal((await handler(new Request(url, { method: 'DELETE' }))).status, 405);
  assert.equal((await handler(request('{}', { ...adminHeaders, 'content-type': 'text/plain' }))).status, 415);
  assert.equal((await handler(request('{', adminHeaders))).status, 400);
  assert.equal((await handler(request('x'.repeat(4097), adminHeaders))).status, 413);
  assert.equal((await handler(request({ action: 'sendMessage' }, adminHeaders))).status, 400);
  const secret = await deriveWebhookSecret(token, url);
  assert.equal((await handler(request('{}', { 'x-telegram-bot-api-secret-token': secret }))).status, 400);
  assert.equal((await handler(request('x'.repeat(65537), { 'x-telegram-bot-api-secret-token': secret }))).status, 413);
  assert.equal(calls.length, 0);
});

test('Telegram API failures do not leak request URLs or credentials', async () => {
  for (const reply of [() => { throw new Error(`Request failed: https://api.telegram.org/bot${token}/getMe`); }, () => json({ ok: false, description: `private ${token}` }), () => new Response('not-json')]) {
    const { handler } = fixture({}, reply);
    const response = await handler(request({ action: 'configure' }, adminHeaders));
    assert.equal(response.status, 502);
    const body = await response.text(); assert.ok(!body.includes(token) && !body.includes('https://'));
  }
});

test('only the Supabase dashboard origin receives setup CORS permissions', async () => {
  const { handler } = fixture();
  const allowed = await handler(new Request(url, { method: 'OPTIONS', headers: { origin: 'https://supabase.com' } }));
  assert.equal(allowed.status, 204); assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://supabase.com');
  const denied = await handler(new Request(url, { method: 'OPTIONS', headers: { origin: 'https://evil.test' } }));
  assert.equal(denied.status, 403); assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('Mini App sessions verify Telegram initData before a server-side profile upsert', async () => {
  const requests = [];
  const { handler } = fixture({ SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key' }, async (method) => {
    // This fixture callback only sees Telegram calls; database calls are handled below.
    return json({ ok: true, result: method === 'getMe' ? { is_bot: true, username: 'urgutservis_bot' } : true });
  });
  const databaseHandler = createEdgeHandler({ env: name => ({ ...values, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key' })[name], fetcher: async (target, options) => {
    requests.push({ target, options });
    if (new URL(target).pathname.endsWith('/telegram_profiles')) return new Response('', { status: 201, headers: { 'content-type': 'application/json' } });
    if (new URL(target).pathname.endsWith('/customers') || new URL(target).pathname.endsWith('/service_staff')) return json([]);
    throw new Error('unexpected target');
  } });
  const initData = await signedInitData();
  const response = await databaseHandler(request({ action: 'miniapp-session', initData }, { origin: 'https://example.com' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, account: 'unlinked', role: 'user', profile: { firstName: 'Ali', lastName: '', username: 'ali' }, customer: null });
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://example.com');
  assert.equal(requests.length, 3);
  assert.match(requests[0].target, /telegram_profiles\?on_conflict=telegram_user_id$/);
  assert.match(requests[1].target, /customers\?telegram_user_id=eq\.456/);
  assert.match(requests[2].target, /service_staff\?telegram_user_id=eq\.456/);
  assert.equal(requests[0].options.headers.authorization, 'Bearer service-role-test-key');
  assert.ok(handler);
});

test('Mini App requests reject altered, expired and unsigned initData before database access', async () => {
  let calls = 0;
  const handler = createEdgeHandler({ env: name => ({ ...values, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key' })[name], fetcher: async () => { calls++; return json([]); } });
  const valid = await signedInitData();
  for (const initData of [valid.replace('Ali', 'Vali'), await signedInitData({ id: 9, first_name: 'Old' }, Math.floor(Date.now() / 1000) - 90_000), 'auth_date=1&hash=bad']) {
    assert.equal((await handler(request({ action: 'miniapp-session', initData }))).status, 401);
  }
  assert.equal(calls, 0);
});

test('admin dashboard requires the Telegram profile to be explicitly assigned an admin role', async () => {
  const calls = [];
  const handler = createEdgeHandler({ env: name => ({ ...values, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key' })[name], fetcher: async (target, options) => {
    const url = new URL(target); calls.push({ url, options });
    if (url.pathname.endsWith('/telegram_profiles')) return new Response('', { status: 201 });
    if (url.pathname.endsWith('/service_staff')) return json([{ role: 'admin' }]);
    if (url.pathname.endsWith('/customers') && url.searchParams.has('order')) return json([{ id: 'f3aa03a9-8e87-462b-9581-985f4399af6f', first_name: 'Ali', last_name: 'Valiyev', phone: '+998901234567' }]);
    if (url.pathname.endsWith('/customers')) return json([]);
    throw new Error('unexpected target');
  } });
  const response = await handler(request({ action: 'admin-dashboard', initData: await signedInitData() }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).customers[0].first_name, 'Ali');
  assert.equal(calls.length, 4);
});

test('generated dashboard entry registers a working handler using the Deno adapter', async () => {
  const previous = globalThis.Deno; let registered;
  globalThis.Deno = { env: { get: name => values[name] }, serve: handler => { registered = handler; } };
  try {
    const source = await readFile(new URL('../supabase/dashboard/telegram-bot.ts', import.meta.url), 'utf8');
    await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    assert.equal(typeof registered, 'function');
    assert.equal((await registered(new Request(url))).status, 200);
    assert.equal((await registered(request(update))).status, 401);
  } finally { if (previous === undefined) delete globalThis.Deno; else globalThis.Deno = previous; }
  const config = await readFile(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  assert.match(config, /\[functions\.telegram-bot\]\s*verify_jwt = false/);
});
