import { replyForUpdate } from './bot-replies.js';
import { verifyMiniAppInitData } from './miniapp-auth.js';

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
  return {
    token, username, miniAppUrl, miniAppOrigin: miniAppUrl ? new URL(miniAppUrl).origin : null,
    setupSecret: env('TELEGRAM_SETUP_SECRET') || '', serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY') || '',
    projectUrl: project.href, webhookUrl: new URL(`/functions/v1/${FUNCTION_NAME}`, project).href,
  };
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

async function databaseRequest(config, path, options, fetcher) {
  if (!config.serviceRoleKey) throw { status: 503, code: 'server_database_required' };
  let response;
  try {
    response = await fetcher(new URL(path, config.projectUrl).href, {
      ...options,
      headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}`, ...(options.headers || {}) },
      signal: AbortSignal.timeout(8000), redirect: 'error',
    });
  } catch { throw { status: 502, code: 'database_connection_failed' }; }
  if (!response.ok) throw { status: 502, code: 'database_request_failed' };
  let body;
  try { body = await response.text(); } catch { throw { status: 502, code: 'database_invalid_response' }; }
  if (!body) return null;
  try { return JSON.parse(body); } catch { throw { status: 502, code: 'database_invalid_response' }; }
}

async function miniAppSession(config, body, fetcher) {
  const telegram = await verifyMiniAppInitData(body?.initData, config.token);
  const profile = {
    telegram_user_id: telegram.telegramUserId,
    first_name: telegram.firstName,
    last_name: telegram.lastName,
    username: telegram.username,
    language_code: telegram.languageCode,
  };
  await databaseRequest(config, '/rest/v1/telegram_profiles?on_conflict=telegram_user_id', {
    method: 'POST', headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([profile]),
  }, fetcher);
  const customers = await databaseRequest(config, `/rest/v1/customers?telegram_user_id=eq.${encodeURIComponent(String(telegram.telegramUserId))}&select=id,first_name,last_name&limit=1`, {
    method: 'GET', headers: { accept: 'application/json' },
  }, fetcher);
  const staff = await databaseRequest(config, `/rest/v1/service_staff?telegram_user_id=eq.${encodeURIComponent(String(telegram.telegramUserId))}&select=role&limit=1`, {
    method: 'GET', headers: { accept: 'application/json' },
  }, fetcher);
  const customer = Array.isArray(customers) ? customers[0] : null;
  const role = Array.isArray(staff) && staff[0]?.role === 'admin' ? 'admin' : 'user';
  return {
    ok: true,
    account: customer ? 'ready' : 'unlinked',
    role,
    profile: { firstName: telegram.firstName, lastName: telegram.lastName, username: telegram.username },
    customer: customer ? { id: customer.id, firstName: customer.first_name, lastName: customer.last_name } : null,
  };
}

export function createEdgeHandler({ env, fetcher = fetch }) {
  return async request => {
    const path = new URL(request.url).pathname.replace(/\/$/, '');
    const validPaths = ['', `/${FUNCTION_NAME}`, `/functions/v1/${FUNCTION_NAME}`];
    let config;
    try { config = configFromEnv(env); } catch { return new Response(JSON.stringify({ error: 'server_configuration_required' }), { status: 503, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } }); }
    const origin = request.headers.get('origin');
    const allowedOrigin = origin === DASHBOARD_ORIGIN || origin === config.miniAppOrigin ? origin : null;
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', vary: 'Origin' };
    if (allowedOrigin) {
      headers['access-control-allow-origin'] = allowedOrigin;
      headers['access-control-allow-headers'] = 'content-type, x-avto-setup-secret';
      headers['access-control-allow-methods'] = 'POST, OPTIONS';
    }
    const send = (status, body) => new Response(JSON.stringify(body), { status, headers });
    if (!validPaths.includes(path)) return send(404, { error: 'not_found' });
    if (request.method === 'OPTIONS') return new Response(null, { status: allowedOrigin ? 204 : 403, headers });
    if (!['GET', 'POST'].includes(request.method)) return send(405, { error: 'method_not_allowed' });
    // Health checks do not invoke Telegram and do not verify that a token is valid.
    if (request.method === 'GET') return send(200, { status: 'ok', service: 'avto-telegram-bot', setupEnabled: validSetupSecret(config.setupSecret), miniAppConfigured: Boolean(config.miniAppUrl) });
    try {
      const setupHeader = request.headers.get('x-avto-setup-secret');
      if (setupHeader !== null) {
        if (!validSetupSecret(config.setupSecret) || !(await matchesSecret(setupHeader, config.setupSecret))) return send(401, { error: 'unauthorized' });
        return send(200, await setup(config, await readJson(request, 4096), fetcher));
      }
      const body = await readJson(request, 65536);
      if (body?.action === 'miniapp-session') return send(200, await miniAppSession(config, body, fetcher));
      const webhookSecret = await deriveWebhookSecret(config.token, config.webhookUrl);
      if (!(await matchesSecret(request.headers.get('x-telegram-bot-api-secret-token'), webhookSecret))) return send(401, { error: 'unauthorized' });
      if (!Number.isSafeInteger(body?.update_id) || body.update_id < 0) return send(400, { error: 'invalid_update' });
      return send(200, replyForUpdate(body, config) || { ok: true });
    } catch (error) {
      const known = ['json_required', 'body_too_large', 'invalid_json', 'invalid_action', 'telegram_connection_failed', 'telegram_invalid_response', 'telegram_request_failed', 'bot_username_mismatch', 'invalid_init_data', 'telegram_identity_invalid', 'telegram_identity_expired', 'invalid_telegram_user', 'server_database_required', 'database_connection_failed', 'database_request_failed', 'database_invalid_response'];
      if (!known.includes(error?.code)) return send(500, { error: 'internal_error' });
      return send(error.status, { error: error.code, ...(error.stage ? { stage: error.stage } : {}) });
    }
  };
}
