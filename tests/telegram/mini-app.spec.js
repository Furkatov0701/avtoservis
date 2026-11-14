import { test, expect } from '@playwright/test';
async function sdk(page, inside = true) {
  await page.route('https://telegram.org/js/telegram-web-app.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    window.telegramEvents = {}; window.backCallbacks = new Set(); window.sdkCalls = [];
    window.Telegram = { WebApp: {
      initData: ${JSON.stringify(inside ? 'unverified-test-fixture' : '')},
      initDataUnsafe: { user: { id: 123, first_name: 'ForgedAdmin', role: 'admin' } },
      viewportStableHeight: 760, safeAreaInset: { top: 20, bottom: 10 }, contentSafeAreaInset: { top: 40 },
      isVersionAtLeast: () => true,
      ready: () => sdkCalls.push('ready'), expand: () => sdkCalls.push('expand'), close: () => { window.closeCalls = (window.closeCalls || 0) + 1; }, setHeaderColor() {}, setBackgroundColor() {},
      onEvent: (name, fn) => { telegramEvents[name] = fn; }, offEvent: name => { delete telegramEvents[name]; },
      BackButton: { show: () => { window.backVisible = true; }, hide: () => { window.backVisible = false; }, onClick: fn => backCallbacks.add(fn), offClick: fn => backCallbacks.delete(fn) }
    }};` }));
}

test('outside Telegram offers the configured bot without exposing sample customers or login forms', async ({ page }) => {
  await sdk(page, false); await page.goto('/app/');
  await expect(page.getByRole('heading', { name: 'Telegram orqali oching' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Telegram botni ochish' })).toHaveAttribute('href', 'https://t.me/AvtoTestBot');
  await expect(page.locator('input')).toHaveCount(0);
  await expect(page.locator('.preview-panel')).toHaveCount(0);
});

test('Telegram viewport and back button work; unverified initData never unlocks an account', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const apiCalls = []; page.on('request', request => { if (/supabase|\/auth\/|\/api\//.test(request.url())) apiCalls.push(request.url()); });
  await page.route('**/functions/v1/telegram-bot', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"telegram_identity_invalid"}' }));
  await sdk(page); await page.goto('/app/');
  await expect(page.getByRole('heading', { name: 'Profilni ulab bo‘lmadi' })).toBeVisible();
  // A rejected Telegram identity cannot be fixed by retrying: the screen says to reopen and shows the code.
  await expect(page.getByText('Xato kodi: telegram_identity_invalid')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ilovani yopish' })).toBeVisible();
  await page.getByRole('button', { name: 'Ilovani yopish' }).click();
  expect(await page.evaluate(() => closeCalls)).toBe(1);
  await expect(page.locator('body')).not.toContainText('ForgedAdmin');
  expect(await page.evaluate(() => sdkCalls)).toEqual(['ready', 'expand']);
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--avto-tg-height'))).toBe('760px');
  await page.getByRole('link', { name: 'Yordam', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Qanday foydalaniladi?' })).toBeVisible();
  expect(await page.evaluate(() => backVisible)).toBe(true);
  await page.evaluate(() => [...backCallbacks].forEach(fn => fn()));
  await expect(page.getByRole('heading', { name: 'Avto kabinetingiz' })).toBeVisible();
  expect(await page.evaluate(() => backCallbacks.size)).toBe(0);
  await page.evaluate(() => { Telegram.WebApp.viewportStableHeight = 600; telegramEvents.viewportChanged(); });
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--avto-tg-height'))).toBe('600px');
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 760 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: '/tmp/avto-telegram-foundation.png', fullPage: true });
  expect(apiCalls.length).toBeGreaterThan(0);
  expect(apiCalls.every(url => url === 'https://lewojwhdkbarktjhyrbi.supabase.co/functions/v1/telegram-bot')).toBe(true);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('unverified-test-fixture');
});

test('SDK loading failure has a working retry', async ({ page }) => {
  await page.route('https://telegram.org/js/telegram-web-app.js', route => route.abort());
  await page.goto('/app/');
  await expect(page.getByRole('heading', { name: 'Telegram bilan bog‘lanib bo‘lmadi' })).toBeVisible();
  await page.unroute('https://telegram.org/js/telegram-web-app.js'); await sdk(page, false);
  await page.getByRole('button', { name: 'Qayta urinish' }).click();
  await expect(page.getByRole('heading', { name: 'Telegram orqali oching' })).toBeVisible();
});

test('unknown and admin routes cannot enter the legacy preview', async ({ page }) => {
  await sdk(page); await page.goto('/app/#/admin/mijozlar');
  await expect(page.getByRole('heading', { name: 'Sahifa topilmadi' })).toBeVisible();
  await expect(page.locator('table')).toHaveCount(0);
});


test('Telegram launch parameters in the URL do not become an application route', async ({ page }) => {
  await sdk(page);
  await page.goto('/app/#tgWebAppData=signed-fixture&tgWebAppVersion=8.0&tgWebAppPlatform=android');
  await expect(page.getByRole('heading', { name: 'Avto kabinetingiz' })).toBeVisible();
  await page.getByRole('link', { name: 'Yordam', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Qanday foydalaniladi?' })).toBeVisible();
  expect(page.url()).toContain('tgWebAppData=');
});
