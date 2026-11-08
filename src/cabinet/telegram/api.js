function edgeEndpoint(env = import.meta.env) {
  const configured = (env.VITE_SUPABASE_URL || '').trim();
  let project;
  try { project = new URL(configured); } catch { return null; }
  if (project.protocol !== 'https:' || project.username || project.password || project.search || project.hash || !['', '/'].includes(project.pathname)) return null;
  return new URL('/functions/v1/telegram-bot', project).href;
}

export async function telegramRequest(initData, action, data = {}, fetcher = fetch, env = import.meta.env) {
  const endpoint = edgeEndpoint(env);
  if (!endpoint || typeof initData !== 'string' || !initData.trim()) throw new Error('telegram_request_unavailable');
  let response;
  try {
    response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, initData, ...data }),
      signal: AbortSignal.timeout(10_000),
      credentials: 'omit',
    });
  } catch { throw new Error('telegram_request_unavailable'); }
  let payload;
  try { payload = await response.json(); } catch { throw new Error('telegram_request_unavailable'); }
  if (!response.ok || payload?.ok !== true) throw new Error('telegram_request_unavailable');
  return payload;
}

export async function loadTelegramSession(initData, fetcher = fetch, env = import.meta.env) {
  const payload = await telegramRequest(initData, 'miniapp-session', {}, fetcher, env);
  if (!['ready', 'unlinked'].includes(payload.account) || !['admin', 'user'].includes(payload.role)) throw new Error('telegram_session_unavailable');
  return payload;
}
