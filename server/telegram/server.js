import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { replyForUpdate } from './handler.js';

export function validWebhookSecret(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string' || !expected) return false;
  const left = Buffer.from(received), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createBotServer(config) {
  return createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 8192 }, async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(body)); };
    if (req.url === '/health' && req.method === 'GET') return send(200, { status: 'ok', service: 'avto-telegram-bot' });
    if (req.url !== '/telegram/webhook') return send(404, { error: 'not_found' });
    if (req.method !== 'POST') return send(405, { error: 'method_not_allowed' });
    if (!validWebhookSecret(req.headers['x-telegram-bot-api-secret-token'], config.webhookSecret)) return send(401, { error: 'unauthorized' });
    if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return send(415, { error: 'json_required' });
    if (Number(req.headers['content-length']) > 65536) return send(413, { error: 'body_too_large' });
    try {
      let bytes = 0; const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 65536) { send(413, { error: 'body_too_large' }); req.resume(); return; }
        chunks.push(chunk);
      }
      let update;
      try { update = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'invalid_json' }); }
      if (!Number.isSafeInteger(update?.update_id) || update.update_id < 0) return send(400, { error: 'invalid_update' });
      // Telegram executes a method returned in the webhook response. No token is sent to the client.
      send(200, replyForUpdate(update, config) || { ok: true });
    } catch { if (!res.headersSent && !res.destroyed) send(400, { error: 'invalid_request' }); }
  });
}
