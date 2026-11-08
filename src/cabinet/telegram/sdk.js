// SDK presence is a UI capability, never proof of identity or authorization.
let loading;
export function loadTelegramSdk() {
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const finish = error => {
      clearTimeout(timeout);
      script.onload = script.onerror = null;
      if (error) { script.remove(); loading = null; reject(error); }
      else resolve(window.Telegram.WebApp);
    };
    const timeout = setTimeout(() => finish(new Error('telegram_sdk_timeout')), 10000);
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => finish(window.Telegram?.WebApp ? null : new Error('telegram_sdk_missing'));
    script.onerror = () => finish(new Error('telegram_sdk_unavailable'));
    document.head.append(script);
  });
  return loading;
}

export function botLink(username) {
  const name = (username || '').trim().replace(/^@/, '');
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(name) && /bot$/i.test(name) ? `https://t.me/${name}` : null;
}

export function mountTelegramViewport(app, style = document.documentElement.style) {
  const properties = ['--avto-tg-height', ...['safe', 'content-safe'].flatMap(kind => ['top', 'bottom', 'left', 'right'].map(side => `--avto-${kind}-${side}`))];
  const previous = new Map(properties.map(name => [name, style.getPropertyValue(name)]));
  const update = () => {
    const height = Number(app.viewportStableHeight);
    if (Number.isFinite(height) && height > 0) style.setProperty('--avto-tg-height', `${height}px`);
    for (const [kind, insets] of [['safe', app.safeAreaInset], ['content-safe', app.contentSafeAreaInset]]) {
      for (const side of ['top', 'bottom', 'left', 'right']) {
        const value = Number(insets?.[side]);
        style.setProperty(`--avto-${kind}-${side}`, `${Number.isFinite(value) ? Math.max(0, Math.min(value, 240)) : 0}px`);
      }
    }
  };
  const events = ['viewportChanged'];
  if (app.isVersionAtLeast?.('8.0')) events.push('safeAreaChanged', 'contentSafeAreaChanged');
  update();
  events.forEach(event => app.onEvent?.(event, update));
  app.ready?.();
  app.expand?.();
  if (app.isVersionAtLeast?.('6.1')) {
    app.setHeaderColor?.('#ffffff');
    app.setBackgroundColor?.('#ffffff');
  }
  return () => {
    events.forEach(event => app.offEvent?.(event, update));
    previous.forEach((value, name) => value ? style.setProperty(name, value) : style.removeProperty(name));
  };
}
