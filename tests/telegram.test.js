import test from 'node:test';
import assert from 'node:assert/strict';
import { readBotConfig } from '../server/telegram/config.js';
import { replyForUpdate } from '../server/telegram/handler.js';
import { validWebhookSecret, createBotServer } from '../server/telegram/server.js';
import { botLink, mountTelegramViewport } from '../src/cabinet/telegram/sdk.js';
const secret = 'local-test-only-not-a-real-secret-123456';
const config = { miniAppUrl: 'https://example.com/app/', webhookSecret: secret, username: 'AvtoTestBot' };
const start = { update_id: 1, message: { text: '/start', from: { id: 123, is_bot: false }, chat: { type: 'private', id: 123 } } };

test('bot config requires HTTPS and a strong webhook secret; frontend links accept only bot usernames', () => {
  assert.equal(readBotConfig({ TELEGRAM_MINI_APP_URL: config.miniAppUrl, TELEGRAM_WEBHOOK_SECRET: secret }).miniAppUrl, config.miniAppUrl);
  for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://localhost']) assert.throws(() => readBotConfig({ TELEGRAM_MINI_APP_URL: url, TELEGRAM_WEBHOOK_SECRET: secret }));
  assert.throws(() => readBotConfig({ TELEGRAM_MINI_APP_URL: config.miniAppUrl, TELEGRAM_WEBHOOK_SECRET: 'short' }));
  assert.equal(botLink('@AvtoTestBot'), 'https://t.me/AvtoTestBot');
  for (const username of ['', 'javascript:alert(1)', 'someone', 'https://t.me/AvtoTestBot', 'AvtoTestBot?start=x']) assert.equal(botLink(username), null);
});

test('bot replies only to supported private commands and never reflects user-controlled links', () => {
  const response = replyForUpdate(start, config);
  assert.equal(response.chat_id, 123);
  assert.equal(response.reply_markup.inline_keyboard[0][0].web_app.url, config.miniAppUrl);
  assert.match(replyForUpdate({ ...start, message: { ...start.message, text: '/help' } }, config).text, /tayyorlanmoqda/);
  for (const change of [{ text: '/startattacker' }, { text: '/start@OtherBot' }, { chat: { type: 'group', id: 123 } }, { from: { id: 456, is_bot: false } }, { from: { id: 123, is_bot: true } }, { text: 'https://evil.test' }]) assert.equal(replyForUpdate({ ...start, message: { ...start.message, ...change } }, config), null);
  assert.equal(replyForUpdate({ ...start, update_id: -1 }, config), null);
  assert.ok(replyForUpdate({ ...start, message: { ...start.message, text: '/start@AvtoTestBot referral' } }, config));
});

test('webhook authentication rejects empty and incorrect secrets', () => {
  assert.equal(validWebhookSecret(secret, secret), true);
  for (const value of [undefined, '', 'wrong', `${secret}x`, secret.replace('local', 'other')]) assert.equal(validWebhookSecret(value, secret), false);
  assert.equal(validWebhookSecret('', ''), false);
});

test('Telegram viewport lifecycle restores styles and removes event listeners', () => {
  const vars = new Map([['--avto-tg-height', '500px']]); const events = new Map(); let ready = 0;
  const style = { getPropertyValue: name => vars.get(name) || '', setProperty: (name, value) => vars.set(name, value), removeProperty: name => vars.delete(name) };
  const app = { viewportStableHeight: 800, safeAreaInset: { top: 20 }, contentSafeAreaInset: { top: 40 }, isVersionAtLeast: () => true, onEvent: (name, fn) => events.set(name, fn), offEvent: name => events.delete(name), ready: () => ready++, expand() {} };
  const cleanup = mountTelegramViewport(app, style);
  assert.equal(ready, 1); assert.equal(vars.get('--avto-tg-height'), '800px');
  assert.equal(vars.get('--avto-content-safe-top'), '40px');
  app.viewportStableHeight = 700; events.get('viewportChanged')();
  assert.equal(vars.get('--avto-tg-height'), '700px');
  cleanup(); assert.equal(events.size, 0); assert.deepEqual([...vars], [['--avto-tg-height', '500px']]);
});

test('HTTP webhook enforces method, secret, JSON and body limits before replying', async () => {
  const server = createBotServer(config);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(`${url}/telegram/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret, ...headers }, body });
  try {
    assert.equal((await fetch(`${url}/health`)).status, 200);
    assert.equal((await fetch(`${url}/telegram/webhook`)).status, 405);
    assert.equal((await post(JSON.stringify(start), { 'x-telegram-bot-api-secret-token': 'wrong' })).status, 401);
    assert.equal((await post(JSON.stringify(start), { 'content-type': 'text/plain' })).status, 415);
    assert.equal((await post('{')).status, 400);
    assert.equal((await post('{}')).status, 400);
    assert.equal((await post('x'.repeat(65537))).status, 413);
    const result = await (await post(JSON.stringify(start))).json();
    assert.equal(result.method, 'sendMessage'); assert.equal(result.chat_id, 123);
    assert.equal(JSON.stringify(result).includes(secret), false);
    assert.deepEqual(await (await post(JSON.stringify({ update_id: 2, edited_message: start.message }))).json(), { ok: true });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
