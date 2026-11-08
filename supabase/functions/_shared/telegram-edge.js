import { replyForUpdate } from './bot-replies.js';

const FUNCTION_NAME = 'telegram-bot';
const DASHBOARD_ORIGIN = 'https://supabase.com';
const encoder = new TextEncoder();

function validSetupSecret(value) {
  return typeof value === 'string' && /^[\x21-\x7e]{32,256}$/.test(value);
}

function configFromEnv(env) {
  const token = env('TELEGRAM_BOT_TOKEN') || '';
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) throw new Error('bot_token_missing');
  let project;
  try { project = new URL(env('SUPABASE_URL') || ''); } catch { throw new Error('project_url_missing'); }
  if (project.protocol !== 'https:' || project.username || project.password || project.search || project.hash || project.pathname !== '/') throw new Error('invalid_project_url');
  const username = (env('TELEGRAM_BOT_USERNAME') || 'urgutservis_bot').replace(/^@/, '');
  if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username) || !/bot$/i.test(username)) throw new Error('invalid_bot_username');
  let miniAppUrl = null;
  const configuredUrl = (env('TELEGRAM_MINI_APP_URL') || '').trim();
  if (configuredUrl) {
    let url;
    try { url = new URL(configuredUrl); } catch { throw new Error('invalid_mini_app_url'); }
    if (url.protocol !== 'https:' || url.username || url.password || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('invalid_mini_app_url');
    miniAppUrl = url.href;
  }
  return { token, username, miniAppUrl, setupSecret: env('TELEGRAM_SETUP_SECRET') || '', webhookUrl: new URL(`/functions/v1/${FUNCTION_NAME}`, project).href };
}

export async function deriveWebhookSecret(token, webhookUrl) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(token), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`avto-webhook-v1:${webhookUrl}`)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function matchesSecret(received, expected) {
  if (typeof received !== 'string' || !expected || received.length > 256) return false;
  const [left, right] = await Promise.all([received, expected].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function readJson(request, limit) {
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw { status: 415, code: 'json_required' };
  if (Number(request.headers.get('content-length')) > limit) throw { status: 413, code: 'body_too_large' };
  const reader = request.body?.getReader();
  if (!reader) throw { status: 400, code: 'invalid_json' };
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw { status: 413, code: 'body_too_large' }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error?.code === 'body_too_large') throw error;
    throw { status: 400, code: 'invalid_json' };
  } finally { reader.releaseLock(); }
}

async function telegramApi(config, method, payload, fetcher) {
  const supported = ['getMe', 'getWebhookInfo', 'setMyCommands', 'setChatMenuButton', 'setWebhook'];
  if (!supported.includes(method)) throw { status: 500, code: 'unsupported_method' };
  let response;
  try {
    response = await fetcher(`https://api.telegram.org/bot${config.token}/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(8000), redirect: 'error',
    });
  } catch { throw { status: 502, code: 'telegram_connection_failed', stage: method }; }
  let result;
  try { result = await response.json(); } catch { throw { status: 502, code: 'telegram_invalid_response', stage: method }; }
  // Never return Telegram's raw error text or a URL containing the bot token.
  if (!response.ok || result?.ok !== true) throw { status: 502, code: 'telegram_request_failed', stage: method };
  return result.result;
}

async function setup(config, body, fetcher) {
  if (!body || !['check', 'configure'].includes(body.action)) throw { status: 400, code: 'invalid_action' };
  const bot = await telegramApi(config, 'getMe', {}, fetcher);
  if (bot?.is_bot !== true || typeof bot.username !== 'string' || bot.username.toLowerCase() !== config.username.toLowerCase()) throw { status: 409, code: 'bot_username_mismatch' };
  if (body.action === 'check') {
    const info = await telegramApi(config, 'getWebhookInfo', {}, fetcher);
    return { ok: true, bot: `@${bot.username}`, webhookMatches: info?.url === config.webhookUrl, pendingUpdates: Number(info?.pending_update_count) || 0, deliveryErrorPresent: Boolean(info?.last_error_message), miniAppConfigured: Boolean(config.miniAppUrl) };
  }
  const secret = await deriveWebhookSecret(config.token, config.webhookUrl);
  await telegramApi(config, 'setMyCommands', { commands: [{ command: 'start', description: 'Avto kabinetni ochish' }, { command: 'help', description: 'Foydalanish bo‘yicha yordam' }] }, fetcher);
  // Until a Telegram-mode frontend is deployed, do not link users to demo accounts.
  if (config.miniAppUrl) await telegramApi(config, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Kabinet', web_app: { url: config.miniAppUrl } } }, fetcher);
  await telegramApi(config, 'setWebhook', { url: config.webhookUrl, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: false }, fetcher);
  return { ok: true, bot: `@${bot.username}`, webhookConfigured: true, miniAppConfigured: Boolean(config.miniAppUrl) };
}

export function createEdgeHandler({ env, fetcher = fetch }) {
  return async request => {
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', vary: 'Origin' };
    if (request.headers.get('origin') === DASHBOARD_ORIGIN) {
      headers['access-control-allow-origin'] = DASHBOARD_ORIGIN;
      headers['access-control-allow-headers'] = 'authorization, apikey, content-type, x-client-info, x-avto-setup-secret';
      headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
    }
    const send = (status, body) => new Response(JSON.stringify(body), { status, headers });
    const path = new URL(request.url).pathname.replace(/\/$/, '');
    const validPaths = ['', `/${FUNCTION_NAME}`, `/functions/v1/${FUNCTION_NAME}`];
    if (!validPaths.includes(path)) return send(404, { error: 'not_found' });
    if (request.method === 'OPTIONS') return new Response(null, { status: request.headers.get('origin') === DASHBOARD_ORIGIN ? 204 : 403, headers });
    if (!['GET', 'POST'].includes(request.method)) return send(405, { error: 'method_not_allowed' });
    let config;
    try { config = configFromEnv(env); } catch { return send(503, { error: 'server_configuration_required' }); }
    // Health checks do not invoke Telegram and do not verify that a token is valid.
    if (request.method === 'GET') return send(200, { status: 'ok', service: 'avto-telegram-bot', setupEnabled: validSetupSecret(config.setupSecret), miniAppConfigured: Boolean(config.miniAppUrl) });
    try {
      const setupHeader = request.headers.get('x-avto-setup-secret');
      if (setupHeader !== null) {
        if (!validSetupSecret(config.setupSecret) || !(await matchesSecret(setupHeader, config.setupSecret))) return send(401, { error: 'unauthorized' });
        return send(200, await setup(config, await readJson(request, 4096), fetcher));
      }
      const webhookSecret = await deriveWebhookSecret(config.token, config.webhookUrl);
      if (!(await matchesSecret(request.headers.get('x-telegram-bot-api-secret-token'), webhookSecret))) return send(401, { error: 'unauthorized' });
      const update = await readJson(request, 65536);
      if (!Number.isSafeInteger(update?.update_id) || update.update_id < 0) return send(400, { error: 'invalid_update' });
      return send(200, replyForUpdate(update, config) || { ok: true });
    } catch (error) {
      const known = ['json_required', 'body_too_large', 'invalid_json', 'invalid_action', 'telegram_connection_failed', 'telegram_invalid_response', 'telegram_request_failed', 'bot_username_mismatch'];
      if (!known.includes(error?.code)) return send(500, { error: 'internal_error' });
      return send(error.status, { error: error.code, ...(error.stage ? { stage: error.stage } : {}) });
    }
  };
}
