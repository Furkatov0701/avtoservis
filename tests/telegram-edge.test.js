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

test('admin vehicle routes validate the selected customer before any database mutation', async () => {
  const calls = [];
  const handler = createEdgeHandler({ env: name => ({ ...values, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key' })[name], fetcher: async target => {
    const url = new URL(target); calls.push(url.pathname);
    if (url.pathname.endsWith('/telegram_profiles')) return new Response('', { status: 201 });
    if (url.pathname.endsWith('/service_staff')) return json([{ role: 'admin' }]);
    if (url.pathname.endsWith('/customers')) return json([]);
    throw new Error('vehicles must not be requested');
  } });
  const response = await handler(request({ action: 'admin-create-vehicle', initData: await signedInitData(), customerId: 'not-a-uuid', vehicle: { model: 'Cobalt', plate: '01 A 123 BC' } }));
  assert.equal(response.status, 400);
  // The Telegram profile can be verified and updated, but invalid input never reaches vehicles.
  assert.deepEqual(calls, ['/rest/v1/telegram_profiles', '/rest/v1/customers', '/rest/v1/service_staff']);
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

// In-memory PostgREST stand-in for the linking and profile tests. It records every
// request so tests can assert exactly which writes happened.
function fakeDatabase({ admin = false, customers = [] } = {}) {
  const state = { customers: customers.map(row => ({ ...row })), requests: [] };
  const digits = phone => { const d = (phone || '').replace(/\D/g, ''); return /^\d{9}$/.test(d) ? `998${d}` : d; };
  const handler = createEdgeHandler({ env: name => ({ ...values, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key' })[name], fetcher: async (target, options) => {
    const url = new URL(target); const method = options.method; const body = options.body ? JSON.parse(options.body) : null;
    state.requests.push({ path: url.pathname, search: url.search, method, body });
    if (url.pathname.endsWith('/telegram_profiles')) return new Response('', { status: 201 });
    if (url.pathname.endsWith('/service_staff')) return json(admin ? [{ role: 'admin' }] : []);
    if (url.pathname.endsWith('/customers')) {
      const filters = [...url.searchParams].filter(([key]) => !['select', 'limit', 'order', 'on_conflict'].includes(key));
      const matches = row => filters.every(([key, value]) => {
        const actual = key === 'phone_normalized' ? digits(row.phone) : row[key];
        if (value === 'is.null') return actual === null || actual === undefined;
        return String(actual) === value.replace(/^eq\./, '');
      });
      if (method === 'GET') return json(state.customers.filter(matches).slice(0, Number(url.searchParams.get('limit')) || undefined).map(row => ({ ...row, phone_normalized: digits(row.phone) })));
      if (method === 'POST') { const created = body.map(row => ({ id: `00000000-0000-4000-8000-00000000000${state.customers.length + 1}`, telegram_user_id: null, last_name: '', ...row })); state.customers.push(...created); return json(created); }
      if (method === 'PATCH') { const changed = state.customers.filter(matches); changed.forEach(row => Object.assign(row, body)); return json(changed); }
    }
    throw new Error(`unexpected ${method} ${url.pathname}`);
  } });
  return { handler, state };
}
const contactUpdate = (contact, from = { id: 456, is_bot: false, first_name: 'Ali' }) => ({ update_id: 99, message: { message_id: 5, from, chat: { id: from.id, type: 'private' }, contact } });
const writes = state => state.requests.filter(item => item.method !== 'GET' && !item.path.endsWith('/telegram_profiles'));

test('a shared contact links only the sender’s own Uzbek number to the matching unlinked customer card', async () => {
  const secret = await deriveWebhookSecret(token, url);
  const headers = { 'x-telegram-bot-api-secret-token': secret };
  const card = { id: 'f3aa03a9-8e87-462b-9581-985f4399af6f', first_name: 'Ali', last_name: 'Valiyev', phone: '+998 (90) 123-45-67', telegram_user_id: null };
  // Someone else's contact never touches the database.
  const foreign = fakeDatabase({ customers: [card] });
  const rejected = await (await foreign.handler(request(contactUpdate({ user_id: 777, phone_number: '998901234567' }), headers))).json();
  assert.match(rejected.text, /o‘zingizning/); assert.equal(foreign.state.requests.length, 0);
  // Non-Uzbek numbers are refused before any database access.
  const abroad = fakeDatabase({ customers: [card] });
  assert.match((await (await abroad.handler(request(contactUpdate({ user_id: 456, phone_number: '+7 999 123 45 67' }), headers))).json()).text, /\+998/);
  assert.equal(abroad.state.requests.length, 0);
  // A forged contact without the webhook secret is rejected.
  assert.equal((await foreign.handler(request(contactUpdate({ user_id: 456, phone_number: '998901234567' })))).status, 401);
  // The real owner links the admin-created card atomically.
  const own = fakeDatabase({ customers: [card] });
  const linked = await (await own.handler(request(contactUpdate({ user_id: 456, phone_number: '+998901234567' }), headers))).json();
  assert.match(linked.text, /tasdiqlandi/); assert.equal(linked.reply_markup.inline_keyboard[0][0].web_app.url, values.TELEGRAM_MINI_APP_URL);
  assert.equal(own.state.customers[0].telegram_user_id, 456);
  const [patch] = writes(own.state);
  assert.equal(patch.method, 'PATCH'); assert.match(patch.search, /telegram_user_id=is\.null/); assert.deepEqual(patch.body, { telegram_user_id: 456 });
});

test('contact linking never takes over a card claimed by another Telegram account and creates a card for new customers', async () => {
  const secret = await deriveWebhookSecret(token, url);
  const headers = { 'x-telegram-bot-api-secret-token': secret };
  const claimed = fakeDatabase({ customers: [{ id: 'f3aa03a9-8e87-462b-9581-985f4399af6f', first_name: 'Vali', phone: '+998901234567', telegram_user_id: 111 }] });
  assert.match((await (await claimed.handler(request(contactUpdate({ user_id: 456, phone_number: '998901234567' }), headers))).json()).text, /administratoriga/);
  assert.equal(writes(claimed.state).length, 0); assert.equal(claimed.state.customers[0].telegram_user_id, 111);
  const fresh = fakeDatabase();
  const reply = await (await fresh.handler(request(contactUpdate({ user_id: 456, phone_number: '998935554433' }, { id: 456, is_bot: false, first_name: 'Sardor', last_name: 'Karimov' }), headers))).json();
  assert.match(reply.text, /tasdiqlandi/);
  assert.deepEqual(writes(fresh.state).map(item => item.body), [[{ telegram_user_id: 456, first_name: 'Sardor', last_name: 'Karimov', phone: '+998935554433' }]]);
  // A linked customer may replace their own number, but not with a number on another card.
  const moving = fakeDatabase({ customers: [{ id: 'a1aa03a9-8e87-462b-9581-985f4399af6f', first_name: 'Sardor', phone: '+998935554433', telegram_user_id: 456 }, { id: 'b2aa03a9-8e87-462b-9581-985f4399af6f', first_name: 'Vali', phone: '+998901234567', telegram_user_id: null }] });
  assert.match((await (await moving.handler(request(contactUpdate({ user_id: 456, phone_number: '998901234567' }), headers))).json()).text, /administratoriga/);
  assert.equal(writes(moving.state).length, 0);
  assert.match((await (await moving.handler(request(contactUpdate({ user_id: 456, phone_number: '998977776655' }), headers))).json()).text, /yangilandi/);
  assert.equal(moving.state.customers[0].phone, '+998977776655');
  // Database failures still answer 200 so Telegram does not retry forever.
  const offline = createEdgeHandler({ env: name => values[name], fetcher: async () => { throw new Error('no database'); } });
  const failed = await offline(request(contactUpdate({ user_id: 456, phone_number: '998901234567' }), headers));
  assert.equal(failed.status, 200); assert.match((await failed.json()).text, /qayta urinib/);
});

test('admins must give a valid unique phone when adding a customer; it is stored in one canonical format', async () => {
  const initData = await signedInitData();
  const db = fakeDatabase({ admin: true, customers: [{ id: 'f3aa03a9-8e87-462b-9581-985f4399af6f', first_name: 'Ali', phone: '90 123 45 67', telegram_user_id: null }] });
  for (const customer of [{ firstName: 'Vali' }, { firstName: 'Vali', phone: '12345' }, { firstName: '', phone: '+998931112233' }]) {
    assert.equal((await db.handler(request({ action: 'admin-create-customer', initData, customer }))).status, 400);
  }
  const duplicate = await db.handler(request({ action: 'admin-create-customer', initData, customer: { firstName: 'Vali', phone: '+998 (90) 123-45-67' } }));
  assert.equal(duplicate.status, 409); assert.equal((await duplicate.json()).error, 'customer_exists');
  const created = await (await db.handler(request({ action: 'admin-create-customer', initData, customer: { firstName: ' Vali ', lastName: 'Aliyev', phone: '93 111 22 33' } }))).json();
  assert.deepEqual({ ...created.customer, id: undefined }, { id: undefined, firstName: 'Vali', lastName: 'Aliyev', phone: '+998931112233' });
  const list = await (await db.handler(request({ action: 'admin-dashboard', initData }))).json();
  assert.ok(list.customers.every(customer => typeof customer.linked === 'boolean' && !('telegram_user_id' in customer)));
  // Customers cannot use admin actions.
  const user = fakeDatabase();
  assert.equal((await user.handler(request({ action: 'admin-create-customer', initData, customer: { firstName: 'X', phone: '+998931112233' } }))).status, 403);
});

test('customers edit only their own name; the verified phone cannot be changed from the Mini App', async () => {
  const initData = await signedInitData();
  const unlinked = fakeDatabase();
  assert.equal((await unlinked.handler(request({ action: 'customer-update-profile', initData, profile: { firstName: 'Ali' } }))).status, 403);
  const db = fakeDatabase({ customers: [{ id: 'f3aa03a9-8e87-462b-9581-985f4399af6f', first_name: 'Ali', last_name: '', phone: '+998901234567', telegram_user_id: 456 }, { id: 'b2aa03a9-8e87-462b-9581-985f4399af6f', first_name: 'Other', phone: '+998931112233', telegram_user_id: 999 }] });
  assert.equal((await db.handler(request({ action: 'customer-update-profile', initData, profile: { firstName: '  ' } }))).status, 400);
  const response = await (await db.handler(request({ action: 'customer-update-profile', initData, profile: { firstName: 'Alisher', lastName: 'Valiyev', phone: '+998000000000' }, customerId: 'b2aa03a9-8e87-462b-9581-985f4399af6f' }))).json();
  assert.equal(response.customer.firstName, 'Alisher'); assert.equal(response.customer.phone, '+998901234567');
  assert.equal(db.state.customers[1].first_name, 'Other');
  const [patch] = writes(db.state);
  assert.match(patch.search, /id=eq\.f3aa03a9/); assert.deepEqual(patch.body, { first_name: 'Alisher', last_name: 'Valiyev' });
});

test('tire records store each wheel’s next date and reject invalid wheel data', async () => {
  const initData = await signedInitData();
  const vehicleId = 'c3aa03a9-8e87-462b-9581-985f4399af6f';
  const inserted = [];
  const handler = createEdgeHandler({ env: name => ({ ...values, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key' })[name], fetcher: async (target, options) => {
    const path = new URL(target).pathname;
    if (path.endsWith('/telegram_profiles')) return new Response('', { status: 201 });
    if (path.endsWith('/service_staff')) return json([{ role: 'admin' }]);
    if (path.endsWith('/customers')) return json([]);
    if (path.endsWith('/vehicles')) return json([{ id: vehicleId, customer_id: 'f3aa03a9-8e87-462b-9581-985f4399af6f', make: 'Chevrolet', model: 'Malibu 2', plate: '30UUU111' }]);
    if (path.endsWith('/service_records')) { const rows = JSON.parse(options.body); inserted.push(rows[0]); return json(rows); }
    throw new Error('unexpected target');
  } });
  const save = record => handler(request({ action: 'admin-create-service-record', initData, vehicleId, record }));
  for (const tirePositions of [[], 'x', { front_left: '2026-13-40' }, { front_left: '2026-04-01' }]) {
    assert.equal((await save({ serviceType: 'tires', performedOn: '2026-05-01', tirePositions })).status, 400);
  }
  assert.equal(inserted.length, 0);
  assert.equal((await save({ serviceType: 'tires', performedOn: '2026-05-01', tirePositions: { front_left: '2026-09-25', rear_right: '2026-09-20', extra: '2026-01-01' } })).status, 200);
  assert.deepEqual(inserted[0].tire_positions, { front_left: '2026-09-25', front_right: null, rear_left: null, rear_right: '2026-09-20' });
  assert.equal(inserted[0].next_due_on, '2026-09-20');
  assert.equal((await save({ serviceType: 'tint', performedOn: '2026-05-01', nextDueOn: '2026-11-10', tirePositions: { front_left: '2026-09-25' } })).status, 200);
  assert.equal(inserted[1].tire_positions, null); assert.equal(inserted[1].next_due_on, '2026-11-10');
});

test('admin overview counts only the latest record per vehicle and service and is admin-only', async () => {
  const initData = await signedInitData();
  const day = offset => new Date(Date.now() + 5 * 3600 * 1000 + offset * 86400000).toISOString().slice(0, 10);
  const owner = { id: 'f3aa03a9-8e87-462b-9581-985f4399af6f', first_name: 'Ali', last_name: 'Valiyev', phone: '+998901234567' };
  const vehicle = { id: 'c3aa03a9-8e87-462b-9581-985f4399af6f', model: 'Malibu 2', make: 'Chevrolet', plate: '30UUU111', customers: owner };
  const records = [
    { id: 'r1', vehicle_id: vehicle.id, service_type: 'engine_oil', performed_on: day(-30), next_due_on: day(-8), vehicles: vehicle },
    { id: 'r2', vehicle_id: vehicle.id, service_type: 'tires', performed_on: day(-10), next_due_on: day(5), vehicles: vehicle },
    { id: 'r3', vehicle_id: vehicle.id, service_type: 'tint', performed_on: day(-5), next_due_on: day(60), vehicles: vehicle },
    // Superseded: an older oil record that was overdue must not be counted again.
    { id: 'r0', vehicle_id: vehicle.id, service_type: 'engine_oil', performed_on: day(-200), next_due_on: day(-100), vehicles: vehicle },
  ];
  const handler = admin => createEdgeHandler({ env: name => ({ ...values, SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key' })[name], fetcher: async target => {
    const path = new URL(target).pathname;
    if (path.endsWith('/telegram_profiles')) return new Response('', { status: 201 });
    if (path.endsWith('/service_staff')) return json(admin ? [{ role: 'admin' }] : []);
    if (path.endsWith('/customers')) return json(new URL(target).searchParams.has('telegram_user_id') ? [] : [{ id: owner.id }, { id: 'x' }]);
    if (path.endsWith('/service_records')) return json(records);
    throw new Error('unexpected target');
  } });
  assert.equal((await handler(false)(request({ action: 'admin-overview', initData }))).status, 403);
  const data = await (await handler(true)(request({ action: 'admin-overview', initData }))).json();
  assert.deepEqual(data.stats, { customers: 2, thisWeek: 1, overdue: 1 });
  assert.deepEqual(data.due.map(item => [item.id, item.days]), [['r1', -8], ['r2', 5]]);
  assert.equal(data.due[0].customer.first_name, 'Ali');
});
