const miniAppEncoder = new TextEncoder();

function asText(value, limit = 128) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function validTelegramUser(user) {
  return user && Number.isSafeInteger(user.id) && user.id > 0 && typeof user.first_name === 'string';
}

export async function verifyMiniAppInitData(initData, botToken, now = Date.now()) {
  if (typeof initData !== 'string' || initData.length < 16 || initData.length > 8192) throw { status: 400, code: 'invalid_init_data' };
  const params = new URLSearchParams(initData);
  const seen = new Set();
  const pairs = [];
  let hash = '';
  for (const [key, value] of params) {
    if (seen.has(key)) throw { status: 400, code: 'invalid_init_data' };
    seen.add(key);
    if (key === 'hash') { hash = value; continue; }
    pairs.push([key, value]);
  }
  if (!/^[a-f0-9]{64}$/i.test(hash)) throw { status: 401, code: 'telegram_identity_invalid' };
  const authDate = Number(params.get('auth_date'));
  if (!Number.isSafeInteger(authDate) || authDate < 1 || authDate * 1000 > now + 60_000 || now - authDate * 1000 > 86_400_000) throw { status: 401, code: 'telegram_identity_expired' };
  pairs.sort(([left], [right]) => left.localeCompare(right));
  const dataCheckString = pairs.map(([key, value]) => `${key}=${value}`).join('\n');
  const webAppKey = await crypto.subtle.importKey('raw', miniAppEncoder.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const secret = await crypto.subtle.sign('HMAC', webAppKey, miniAppEncoder.encode(botToken));
  const checkKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', checkKey, miniAppEncoder.encode(dataCheckString)));
  const expected = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  if (!(await constantTimeEqual(hash.toLowerCase(), expected))) throw { status: 401, code: 'telegram_identity_invalid' };
  let user;
  try { user = JSON.parse(params.get('user') || ''); } catch { throw { status: 400, code: 'invalid_init_data' }; }
  if (!validTelegramUser(user)) throw { status: 400, code: 'invalid_telegram_user' };
  return {
    telegramUserId: user.id,
    firstName: asText(user.first_name, 80),
    lastName: asText(user.last_name, 80),
    username: asText(user.username, 32).replace(/^@/, ''),
    languageCode: asText(user.language_code, 16),
  };
}

export async function constantTimeEqual(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string' || received.length !== expected.length) return false;
  const [left, right] = await Promise.all([received, expected].map(value => crypto.subtle.digest('SHA-256', miniAppEncoder.encode(value))));
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}
