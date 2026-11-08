export function readBotConfig(env) {
  let url;
  try { url = new URL(env.TELEGRAM_MINI_APP_URL || ''); } catch { throw new Error('TELEGRAM_MINI_APP_URL must be an HTTPS URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('TELEGRAM_MINI_APP_URL must be a public HTTPS URL');
  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET || '';
  if (!/^[a-zA-Z0-9_-]{32,256}$/.test(webhookSecret)) throw new Error('TELEGRAM_WEBHOOK_SECRET must contain 32–256 letters, digits, underscores or hyphens');
  const username = (env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
  if (username && (!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username) || !/bot$/i.test(username))) throw new Error('TELEGRAM_BOT_USERNAME is invalid');
  return { miniAppUrl: url.href, webhookSecret, username };
}
