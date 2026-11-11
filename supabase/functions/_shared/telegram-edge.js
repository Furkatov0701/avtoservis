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

function firstRow(value) {
  return Array.isArray(value) ? value[0] || null : null;
}

function cleanText(value, maximum) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function validUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

const serviceTypes = new Set(['tires', 'engine_oil', 'antifreeze', 'tint']);
const tirePositionKeys = ['front_left', 'front_right', 'rear_left', 'rear_right'];
const readHeaders = { accept: 'application/json' };
const writeJson = { 'content-type': 'application/json', prefer: 'return=representation' };

// Uzbek mobile numbers only. Returns the 12 digits used for matching
// (customers.phone_normalized) and the canonical value stored in customers.phone.
export function normalizeUzPhone(value) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  const full = /^\d{9}$/.test(digits) ? `998${digits}` : digits;
  return /^998\d{9}$/.test(full) ? { digits: full, phone: `+${full}` } : null;
}

function customerView(row) {
  return { id: row.id, firstName: row.first_name, lastName: row.last_name, phone: row.phone };
}

async function miniAppActor(config, body, fetcher) {
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
  const customers = await databaseRequest(config, `/rest/v1/customers?telegram_user_id=eq.${encodeURIComponent(String(telegram.telegramUserId))}&select=id,first_name,last_name,phone&limit=1`, {
    method: 'GET', headers: { accept: 'application/json' },
  }, fetcher);
  const staff = await databaseRequest(config, `/rest/v1/service_staff?telegram_user_id=eq.${encodeURIComponent(String(telegram.telegramUserId))}&select=role&limit=1`, {
    method: 'GET', headers: { accept: 'application/json' },
  }, fetcher);
  const customer = firstRow(customers);
  const role = firstRow(staff)?.role === 'admin' ? 'admin' : 'user';
  return { telegram, customer, role };
}

async function miniAppSession(config, body, fetcher) {
  const { telegram, customer, role } = await miniAppActor(config, body, fetcher);
  return {
    ok: true,
    account: customer ? 'ready' : 'unlinked',
    role,
    profile: { firstName: telegram.firstName, lastName: telegram.lastName, username: telegram.username },
    customer: customer ? customerView(customer) : null,
  };
}

async function customerUpdateProfile(config, body, fetcher) {
  const actor = await miniAppActor(config, body, fetcher);
  if (!actor.customer) throw { status: 403, code: 'customer_required' };
  const firstName = cleanText(body?.profile?.firstName, 80);
  const lastName = cleanText(body?.profile?.lastName, 80);
  if (!firstName) throw { status: 400, code: 'invalid_profile' };
  // The phone number is not editable here: it changes only through a verified Telegram contact.
  const rows = await databaseRequest(config, `/rest/v1/customers?id=eq.${encodeURIComponent(actor.customer.id)}`, {
    method: 'PATCH', headers: writeJson, body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  }, fetcher);
  const customer = firstRow(rows);
  if (!customer) throw { status: 502, code: 'database_invalid_response' };
  return { ok: true, customer: customerView(customer) };
}

async function requireAdmin(config, body, fetcher) {
  const actor = await miniAppActor(config, body, fetcher);
  if (actor.role !== 'admin') throw { status: 403, code: 'admin_required' };
  return actor;
}

async function adminDashboard(config, body, fetcher) {
  await requireAdmin(config, body, fetcher);
  const customers = await databaseRequest(config, '/rest/v1/customers?select=id,first_name,last_name,phone,telegram_user_id,created_at&order=created_at.desc&limit=500', {
    method: 'GET', headers: readHeaders,
  }, fetcher);
  // Telegram user ids stay on the server; the admin only needs to know whether the customer is linked.
  const list = (Array.isArray(customers) ? customers : []).map(({ telegram_user_id: telegramUserId, ...customer }) => ({ ...customer, linked: telegramUserId !== null && telegramUserId !== undefined }));
  return { ok: true, customers: list };
}

async function adminCreateCustomer(config, body, fetcher) {
  await requireAdmin(config, body, fetcher);
  const firstName = cleanText(body?.customer?.firstName, 80);
  const lastName = cleanText(body?.customer?.lastName, 80);
  const phone = normalizeUzPhone(cleanText(body?.customer?.phone, 32));
  // The phone number is required: it is how the customer's Telegram account is linked later.
  if (!firstName || !phone) throw { status: 400, code: 'invalid_customer' };
  const existing = await databaseRequest(config, `/rest/v1/customers?phone_normalized=eq.${phone.digits}&select=id&limit=1`, { method: 'GET', headers: readHeaders }, fetcher);
  if (firstRow(existing)) throw { status: 409, code: 'customer_exists' };
  const rows = await databaseRequest(config, '/rest/v1/customers', {
    method: 'POST', headers: writeJson,
    body: JSON.stringify([{ first_name: firstName, last_name: lastName, phone: phone.phone }]),
  }, fetcher);
  const customer = firstRow(rows);
  if (!customer) throw { status: 502, code: 'database_invalid_response' };
  return { ok: true, customer: customerView(customer) };
}

async function adminVehicles(config, body, fetcher) {
  await requireAdmin(config, body, fetcher);
  const customerId = body?.customerId;
  // Without a customer the admin sees every vehicle with its owner's name.
  if (customerId !== undefined && customerId !== null && !validUuid(customerId)) throw { status: 400, code: 'invalid_vehicle' };
  const filter = customerId ? `customer_id=eq.${encodeURIComponent(customerId)}&` : '';
  const vehicles = await databaseRequest(config, `/rest/v1/vehicles?${filter}select=id,customer_id,make,model,plate,production_year,created_at,customers(first_name,last_name),service_records(id,service_type,performed_on,next_due_on,odometer_km,created_at)&order=created_at.desc&limit=500`, {
    method: 'GET', headers: readHeaders,
  }, fetcher);
  return { ok: true, vehicles: Array.isArray(vehicles) ? vehicles : [] };
}

// Today in Uzbekistan (UTC+5, no daylight saving), as YYYY-MM-DD.
function serviceToday(now = Date.now()) {
  return new Date(now + 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

// Admin home: customer count and the services that are overdue or due within 7 days.
// Only the most recent record of each vehicle and service counts; older ones are history.
async function adminOverview(config, body, fetcher) {
  await requireAdmin(config, body, fetcher);
  const customers = await databaseRequest(config, '/rest/v1/customers?select=id&limit=10000', { method: 'GET', headers: readHeaders }, fetcher);
  const records = await databaseRequest(config, '/rest/v1/service_records?select=id,vehicle_id,service_type,performed_on,next_due_on,created_at,vehicles(id,model,make,plate,customers(id,first_name,last_name,phone))&order=performed_on.desc,created_at.desc&limit=10000', { method: 'GET', headers: readHeaders }, fetcher);
  const today = serviceToday();
  const latest = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const key = `${record.vehicle_id}:${record.service_type}`;
    if (!latest.has(key)) latest.set(key, record);
  }
  const due = [...latest.values()]
    .filter(record => validDate(record.next_due_on))
    .map(record => ({ record, days: daysBetween(today, record.next_due_on) }))
    .filter(item => item.days <= 7)
    .sort((a, b) => a.days - b.days)
    .map(({ record, days }) => ({
      id: record.id, serviceType: record.service_type, nextDueOn: record.next_due_on, days,
      vehicle: record.vehicles ? { id: record.vehicles.id, model: record.vehicles.model, make: record.vehicles.make, plate: record.vehicles.plate } : null,
      customer: record.vehicles?.customers ? { id: record.vehicles.customers.id, first_name: record.vehicles.customers.first_name, last_name: record.vehicles.customers.last_name, phone: record.vehicles.customers.phone } : null,
    }));
  return {
    ok: true, today,
    stats: { customers: Array.isArray(customers) ? customers.length : 0, thisWeek: due.filter(item => item.days >= 0).length, overdue: due.filter(item => item.days < 0).length },
    due: due.slice(0, 50),
  };
}

async function adminCreateVehicle(config, body, fetcher) {
  await requireAdmin(config, body, fetcher);
  const customerId = body?.customerId;
  const make = cleanText(body?.vehicle?.make, 80);
  const model = cleanText(body?.vehicle?.model, 100);
  const plate = cleanText(body?.vehicle?.plate, 24).toUpperCase();
  const suppliedYear = cleanText(String(body?.vehicle?.productionYear ?? ''), 4);
  const productionYear = suppliedYear ? Number(suppliedYear) : null;
  if (!validUuid(customerId) || !model || !plate || (productionYear !== null && (!Number.isInteger(productionYear) || productionYear < 1900 || productionYear > 2100))) throw { status: 400, code: 'invalid_vehicle' };
  const rows = await databaseRequest(config, '/rest/v1/vehicles', {
    method: 'POST', headers: { 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify([{ customer_id: customerId, make, model, plate, production_year: productionYear }]),
  }, fetcher);
  const vehicle = firstRow(rows);
  if (!vehicle) throw { status: 502, code: 'database_invalid_response' };
  return { ok: true, vehicle: { id: vehicle.id, make: vehicle.make, model: vehicle.model, plate: vehicle.plate, productionYear: vehicle.production_year } };
}

async function vehicleForAdmin(config, vehicleId, fetcher) {
  if (!validUuid(vehicleId)) throw { status: 400, code: 'invalid_service_record' };
  const vehicles = await databaseRequest(config, `/rest/v1/vehicles?id=eq.${encodeURIComponent(vehicleId)}&select=id,customer_id,make,model,plate&limit=1`, {
    method: 'GET', headers: { accept: 'application/json' },
  }, fetcher);
  const vehicle = firstRow(vehicles);
  if (!vehicle) throw { status: 404, code: 'vehicle_not_found' };
  return vehicle;
}

async function adminServiceRecords(config, body, fetcher) {
  await requireAdmin(config, body, fetcher);
  const vehicle = await vehicleForAdmin(config, body?.vehicleId, fetcher);
  const records = await databaseRequest(config, `/rest/v1/service_records?vehicle_id=eq.${encodeURIComponent(vehicle.id)}&select=id,service_type,performed_on,next_due_on,odometer_km,notes,tire_positions,created_at&order=performed_on.desc,created_at.desc`, {
    method: 'GET', headers: { accept: 'application/json' },
  }, fetcher);
  return { ok: true, vehicle, records: Array.isArray(records) ? records : [] };
}

async function adminCreateServiceRecord(config, body, fetcher) {
  await requireAdmin(config, body, fetcher);
  const vehicle = await vehicleForAdmin(config, body?.vehicleId, fetcher);
  const serviceType = cleanText(body?.record?.serviceType, 32);
  const performedOn = cleanText(body?.record?.performedOn, 10);
  let nextDueOn = cleanText(body?.record?.nextDueOn, 10) || null;
  const notes = cleanText(body?.record?.notes, 2000);
  const odometerText = cleanText(String(body?.record?.odometerKm ?? ''), 12);
  const odometerKm = odometerText ? Number(odometerText) : null;
  if (!serviceTypes.has(serviceType) || !validDate(performedOn) || (nextDueOn && (!validDate(nextDueOn) || nextDueOn < performedOn)) || (odometerKm !== null && (!Number.isInteger(odometerKm) || odometerKm < 0))) throw { status: 400, code: 'invalid_service_record' };
  // Tires: the next replacement date of each wheel. Other services never store wheel data.
  let tirePositions = null;
  if (serviceType === 'tires' && body?.record?.tirePositions !== undefined && body.record.tirePositions !== null) {
    const supplied = body.record.tirePositions;
    if (typeof supplied !== 'object' || Array.isArray(supplied)) throw { status: 400, code: 'invalid_service_record' };
    const wheels = Object.fromEntries(tirePositionKeys.map(key => [key, cleanText(supplied[key] ?? '', 10) || null]));
    if (Object.values(wheels).some(date => date && (!validDate(date) || date < performedOn))) throw { status: 400, code: 'invalid_service_record' };
    const dates = Object.values(wheels).filter(Boolean).sort();
    if (dates.length) {
      tirePositions = wheels;
      if (!nextDueOn) nextDueOn = dates[0];
    }
  }
  const rows = await databaseRequest(config, '/rest/v1/service_records', {
    method: 'POST', headers: writeJson,
    body: JSON.stringify([{ vehicle_id: vehicle.id, service_type: serviceType, performed_on: performedOn, next_due_on: nextDueOn, odometer_km: odometerKm, notes, tire_positions: tirePositions }]),
  }, fetcher);
  const record = firstRow(rows);
  if (!record) throw { status: 502, code: 'database_invalid_response' };
  return { ok: true, record };
}

async function customerVehicles(config, body, fetcher) {
  const actor = await miniAppActor(config, body, fetcher);
  if (!actor.customer) return { ok: true, account: 'unlinked', vehicles: [] };
  const vehicles = await databaseRequest(config, `/rest/v1/vehicles?customer_id=eq.${encodeURIComponent(actor.customer.id)}&select=id,make,model,plate,production_year,service_records(id,service_type,performed_on,next_due_on,odometer_km,notes,tire_positions)&order=created_at.desc`, {
    method: 'GET', headers: { accept: 'application/json' },
  }, fetcher);
  return { ok: true, account: 'ready', vehicles: Array.isArray(vehicles) ? vehicles : [] };
}

function contactReply(config, chatId, text, openApp = false) {
  const reply = { method: 'sendMessage', chat_id: chatId, text };
  if (openApp && config.miniAppUrl) reply.reply_markup = { inline_keyboard: [[{ text: 'Kabinetni ochish', web_app: { url: config.miniAppUrl } }]] };
  return reply;
}

// Called only after the webhook secret was verified, so the update really comes
// from Telegram. A contact links an account only when it is the sender's own
// number (contact.user_id === from.id), which Telegram guarantees for the
// "share my phone number" flow used by the Mini App.
async function linkContact(config, update, fetcher) {
  const message = update.message;
  const from = message?.from;
  if (message?.chat?.type !== 'private' || from?.is_bot !== false || !Number.isSafeInteger(from?.id) || from.id <= 0 || message.chat.id !== from.id) return { ok: true };
  const chatId = from.id;
  if (message.contact.user_id !== from.id) return contactReply(config, chatId, 'Iltimos, faqat o‘zingizning telefon raqamingizni ulashing.');
  const phone = normalizeUzPhone(message.contact.phone_number);
  if (!phone) return contactReply(config, chatId, 'Hozircha faqat O‘zbekiston (+998) raqamlari qabul qilinadi.');
  try {
    const firstName = cleanText(from.first_name, 80) || 'Mijoz';
    const lastName = cleanText(from.last_name, 80);
    await databaseRequest(config, '/rest/v1/telegram_profiles?on_conflict=telegram_user_id', {
      method: 'POST', headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ telegram_user_id: from.id, first_name: firstName, last_name: lastName, username: cleanText(from.username, 32), language_code: cleanText(from.language_code, 16) }]),
    }, fetcher);
    const own = firstRow(await databaseRequest(config, `/rest/v1/customers?telegram_user_id=eq.${from.id}&select=id,phone_normalized&limit=1`, { method: 'GET', headers: readHeaders }, fetcher));
    const matches = await databaseRequest(config, `/rest/v1/customers?phone_normalized=eq.${phone.digits}&select=id,telegram_user_id&limit=2`, { method: 'GET', headers: readHeaders }, fetcher);
    const conflict = () => contactReply(config, chatId, 'Bu raqam boshqa mijoz kartasiga biriktirilgan. Iltimos, servis administratoriga murojaat qiling.');
    const cards = Array.isArray(matches) ? matches : [];
    if (own) {
      // Already linked: the number may change only if no other card uses it.
      if (cards.some(row => row.id !== own.id)) return conflict();
      if (own.phone_normalized !== phone.digits) {
        await databaseRequest(config, `/rest/v1/customers?id=eq.${encodeURIComponent(own.id)}`, { method: 'PATCH', headers: writeJson, body: JSON.stringify({ phone: phone.phone }) }, fetcher);
      }
      return contactReply(config, chatId, 'Telefon raqamingiz yangilandi ✅', true);
    }
    // Not linked yet: refuse claimed cards and ambiguous duplicates; link a single free card.
    if (cards.length > 1 || cards.some(row => row.telegram_user_id !== null && row.telegram_user_id !== undefined)) return conflict();
    const unlinked = cards[0];
    if (unlinked) {
      // The telegram_user_id filter makes the link atomic: a card already claimed is never taken over.
      const linked = firstRow(await databaseRequest(config, `/rest/v1/customers?id=eq.${encodeURIComponent(unlinked.id)}&telegram_user_id=is.null`, { method: 'PATCH', headers: writeJson, body: JSON.stringify({ telegram_user_id: from.id }) }, fetcher));
      if (!linked) return conflict();
    } else {
      await databaseRequest(config, '/rest/v1/customers', { method: 'POST', headers: writeJson, body: JSON.stringify([{ telegram_user_id: from.id, first_name: firstName, last_name: lastName, phone: phone.phone }]) }, fetcher);
    }
    return contactReply(config, chatId, 'Raqamingiz tasdiqlandi ✅ Endi kabinetingizni ochishingiz mumkin.', true);
  } catch {
    // Reply with 200 so Telegram does not retry the same update in a loop.
    return contactReply(config, chatId, 'Hozir raqamni ulab bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.');
  }
}

async function miniAppAction(config, body, fetcher) {
  if (!body || typeof body.action !== 'string') throw { status: 400, code: 'invalid_action' };
  if (body.action === 'miniapp-session') return miniAppSession(config, body, fetcher);
  if (body.action === 'admin-dashboard') return adminDashboard(config, body, fetcher);
  if (body.action === 'admin-overview') return adminOverview(config, body, fetcher);
  if (body.action === 'admin-create-customer') return adminCreateCustomer(config, body, fetcher);
  if (body.action === 'admin-vehicles') return adminVehicles(config, body, fetcher);
  if (body.action === 'admin-create-vehicle') return adminCreateVehicle(config, body, fetcher);
  if (body.action === 'admin-service-records') return adminServiceRecords(config, body, fetcher);
  if (body.action === 'admin-create-service-record') return adminCreateServiceRecord(config, body, fetcher);
  if (body.action === 'customer-vehicles') return customerVehicles(config, body, fetcher);
  if (body.action === 'customer-update-profile') return customerUpdateProfile(config, body, fetcher);
  throw { status: 400, code: 'invalid_action' };
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
      if (['miniapp-session', 'admin-dashboard', 'admin-overview', 'admin-create-customer', 'admin-vehicles', 'admin-create-vehicle', 'admin-service-records', 'admin-create-service-record', 'customer-vehicles', 'customer-update-profile'].includes(body?.action)) return send(200, await miniAppAction(config, body, fetcher));
      const webhookSecret = await deriveWebhookSecret(config.token, config.webhookUrl);
      if (!(await matchesSecret(request.headers.get('x-telegram-bot-api-secret-token'), webhookSecret))) return send(401, { error: 'unauthorized' });
      if (!Number.isSafeInteger(body?.update_id) || body.update_id < 0) return send(400, { error: 'invalid_update' });
      if (body.message?.contact && typeof body.message.contact === 'object') return send(200, await linkContact(config, body, fetcher));
      return send(200, replyForUpdate(body, config) || { ok: true });
    } catch (error) {
    const known = ['json_required', 'body_too_large', 'invalid_json', 'invalid_action', 'invalid_customer', 'customer_exists', 'customer_required', 'invalid_profile', 'invalid_vehicle', 'invalid_service_record', 'vehicle_not_found', 'admin_required', 'telegram_connection_failed', 'telegram_invalid_response', 'telegram_request_failed', 'bot_username_mismatch', 'invalid_init_data', 'telegram_identity_invalid', 'telegram_identity_expired', 'invalid_telegram_user', 'server_database_required', 'database_connection_failed', 'database_request_failed', 'database_invalid_response'];
      if (!known.includes(error?.code)) return send(500, { error: 'internal_error' });
      return send(error.status, { error: error.code, ...(error.stage ? { stage: error.stage } : {}) });
    }
  };
}
