export function readAuthConfig(env) {
  const mode = env.VITE_APP_MODE || 'preview';
  if (!['preview', 'live'].includes(mode)) return { mode: 'live', error: 'invalid_mode' };
  const url = (env.VITE_SUPABASE_URL || '').trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  const smsEnabled = env.VITE_PHONE_AUTH_ENABLED === 'true';
  if (!url || !key) return { mode, error: 'missing_config', smsEnabled };
  try {
    const parsed = new URL(url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) throw new Error();
  } catch { return { mode, error: 'invalid_url', smsEnabled }; }
  let publicKey = key.startsWith('sb_publishable_');
  if (!publicKey && key.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      publicKey = payload.role === 'anon';
    } catch { publicKey = false; }
  }
  if (!publicKey) return { mode, error: 'unsafe_key', smsEnabled };
  return { mode, url: url.replace(/\/$/, ''), key, smsEnabled, error: null };
}
