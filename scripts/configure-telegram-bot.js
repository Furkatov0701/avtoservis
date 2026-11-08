import { execFile } from 'node:child_process';
import { readBotConfig } from '../server/telegram/config.js';

// curl uses the execution environment's inherited proxy and CA trust.
// Credentials go through stdin, never command arguments, shell expansion or logs.
function api(token, method, payload = {}) {
  return new Promise((resolve, reject) => {
    const escape = value => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    const config = `url = "https://api.telegram.org/bot${token}/${method}"\nrequest = "POST"\nheader = "Content-Type: application/json"\ndata = "${escape(JSON.stringify(payload))}"\n`;
    const child = execFile('curl', ['--silent', '--show-error', '--max-time', '20', '--config', '-'], { maxBuffer: 262144 }, (error, stdout) => {
      if (error) return reject(new Error(`Telegram ${method} connection failed. Check network access and server settings.`));
      let response;
      try { response = JSON.parse(stdout); } catch { return reject(new Error(`Telegram ${method} returned an invalid response.`)); }
      if (!response.ok) return reject(new Error(`Telegram ${method} failed (code ${Number(response.error_code) || 'unknown'}). Check the bot configuration.`));
      resolve(response.result);
    });
    child.stdin.on('error', () => {});
    child.stdin.end(config);
  });
}

try {
  const mode = process.argv[2];
  if (!['--check', '--configure'].includes(mode)) throw new Error('Use --check for read-only validation or --configure to apply commands, menu and webhook.');
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!/^\d+:[a-zA-Z0-9_-]{20,}$/.test(token)) throw new Error('Set TELEGRAM_BOT_TOKEN in server secret settings. Never send it in chat.');
  // Validate all configuration before performing any remote mutation.
  let config, webhook;
  if (mode === '--configure') {
    config = readBotConfig(process.env);
    try { webhook = new URL(process.env.TELEGRAM_WEBHOOK_URL || ''); } catch { throw new Error('Set TELEGRAM_WEBHOOK_URL to the deployed HTTPS webhook.'); }
    if (webhook.protocol !== 'https:' || webhook.username || webhook.password || webhook.search || webhook.hash || webhook.pathname !== '/telegram/webhook' || (webhook.port && webhook.port !== '443')) throw new Error('TELEGRAM_WEBHOOK_URL must use HTTPS port 443 and /telegram/webhook.');
  }
  const bot = await api(token, 'getMe');
  const expected = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '').toLowerCase();
  if (!bot.is_bot || !bot.username || (expected && expected !== bot.username.toLowerCase())) throw new Error('Bot identity does not match TELEGRAM_BOT_USERNAME.');
  console.log(`Bot verified: @${bot.username}`);
  if (mode === '--check') {
    const info = await api(token, 'getWebhookInfo');
    console.log(JSON.stringify({ webhookConfigured: Boolean(info.url), pendingUpdates: info.pending_update_count, deliveryErrorPresent: Boolean(info.last_error_message) }));
  } else {
    await api(token, 'setMyCommands', { commands: [{ command: 'start', description: 'Avto kabinetni ochish' }, { command: 'help', description: 'Foydalanish bo‘yicha yordam' }] });
    await api(token, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Kabinet', web_app: { url: config.miniAppUrl } } });
    await api(token, 'setWebhook', { url: webhook.href, secret_token: config.webhookSecret, allowed_updates: ['message'], drop_pending_updates: false });
    console.log('Commands, Mini App menu and webhook configured. Verify /start inside Telegram.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
