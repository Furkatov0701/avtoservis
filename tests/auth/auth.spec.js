import { test, expect } from '@playwright/test';
const id = '00000000-0000-4000-8000-000000000001';
const user = { id, aud: 'authenticated', role: 'authenticated', phone: '998971234567', phone_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'phone', providers: ['phone'] }, user_metadata: { first_name: 'Ali', role: 'admin' } };
const token = () => `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`;
const session = () => ({ access_token: token(), refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, user });
async function backend(page, options = {}) {
  const calls = [];
  await page.route('https://auth-test.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postDataJSON();
    calls.push({ path: url.pathname, search: url.search, method: request.method(), body });
    let status = 200; let result = {};
    if (url.pathname.endsWith('/token')) {
      if (options.unconfirmed) { status = 400; result = { code: 'phone_not_confirmed', msg: 'Phone not confirmed' }; }
      else if (body?.password === 'wrongpass' || options.invalidLogin) { status = 400; result = { code: 'invalid_credentials', msg: 'Invalid login credentials' }; }
      else { if (options.delayLogin) await new Promise(resolve => setTimeout(resolve, 300)); result = session(); }
    } else if (url.pathname.endsWith('/user')) result = user;
    else if (url.pathname === '/rest/v1/profiles') {
      if (options.profileError) { status = 500; result = { message: 'private detail' }; }
      else result = [{ id, first_name: 'Ali', last_name: 'Valiyev', role: options.role || 'user' }];
    } else if (url.pathname.endsWith('/signup')) result = { ...user, phone_confirmed_at: undefined };
    else if (url.pathname.endsWith('/verify')) {
      if (body.token !== '123456') { status = 403; result = { code: 'otp_expired', msg: 'expired' }; }
      else result = session();
    } else if (url.pathname.endsWith('/logout')) status = 204;
    else if (!url.pathname.endsWith('/otp') && !url.pathname.endsWith('/resend')) throw new Error(`Unexpected mock request: ${url.pathname}`);
    await route.fulfill({ status, contentType: 'application/json', headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' }, body: status === 204 ? '' : JSON.stringify(result) });
  });
  return calls;
}
async function login(page, password = 'correctpass') {
  await page.goto('/app/#/kirish');
  await page.getByLabel('Telefon raqami', { exact: false }).fill('+998 97 123 45 67');
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Kirish', exact: true }).click();
}

test('login errors retain phone; database role controls access and session survives refresh', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const calls = await backend(page);
  await login(page, 'wrongpass');
  await expect(page.getByRole('alert')).toContainText('Telefon raqami yoki parol noto‘g‘ri.');
  await expect(page.locator('#phone')).toHaveValue('+998 97 123 45 67');
  await page.locator('#password').fill('correctpass');
  await page.getByRole('button', { name: 'Kirish', exact: true }).click();
  await expect(page).toHaveURL(/#\/user\/mashinalar$/);
  await expect(page.locator('.bottom-nav .nav-item')).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.goto('/app/#/admin/mijozlar');
  await expect(page.getByRole('heading', { name: 'Ruxsat yo‘q' })).toBeVisible();
  await page.goto('/app/#/user/profil');
  await expect(page.getByRole('heading', { name: 'Ali Valiyev' })).toBeVisible();
  await page.getByRole('button', { name: 'Chiqish', exact: true }).click();
  await expect(page).toHaveURL(/#\/kirish$/);
  await page.goto('/app/#/user/profil');
  await expect(page).toHaveURL(/#\/kirish$/);
  const stored = await page.evaluate(() => JSON.stringify(localStorage));
  expect(stored).not.toContain('correctpass'); expect(stored).not.toContain('fixture-refresh');
  expect(calls.some(call => call.path.endsWith('/logout'))).toBeTruthy();
  expect(errors).toEqual([]);
});

test('only one login request is sent while pending; admin menu comes from database profile', async ({ page }) => {
  const calls = await backend(page, { role: 'admin', delayLogin: true });
  await page.goto('/app/#/admin/kirish');
  await page.locator('#phone').fill('971234567'); await page.locator('#password').fill('correctpass');
  await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page).toHaveURL(/#\/admin\/bosh-sahifa$/);
  await expect(page.locator('.bottom-nav .nav-item')).toHaveCount(5);
  expect(calls.filter(call => call.path.endsWith('/token'))).toHaveLength(1);
});

test('profile lookup failure blocks cabinet instead of trusting token metadata', async ({ page }) => {
  await backend(page, { profileError: true }); await login(page);
  await expect(page.getByRole('heading', { name: 'Profilni tekshirib bo‘lmadi' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('alert')).not.toContainText('private detail');
});

test('registration submits no role, waits for valid SMS and does not persist passwords', async ({ page }) => {
  const calls = await backend(page);
  await page.goto('/app/#/royxatdan-otish');
  await page.locator('#firstName').fill('Ali'); await page.locator('#lastName').fill('Valiyev');
  await page.locator('#phone').fill('971234567'); await page.locator('#password').fill('newsecurepass'); await page.locator('#confirm').fill('newsecurepass');
  await page.getByRole('button', { name: 'Ro‘yxatdan o‘tish', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Telefonni tasdiqlang' })).toBeVisible();
  expect(calls.find(call => call.path.endsWith('/signup')).body.data).toEqual({ first_name: 'Ali', last_name: 'Valiyev' });
  await expect(page.getByRole('button', { name: /Qayta yuborish/ })).toBeDisabled();
  await page.locator('#code').fill('000000'); await page.getByRole('button', { name: 'Tasdiqlash', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('muddati tugagan');
  await page.locator('#code').fill('123456'); await page.getByRole('button', { name: 'Tasdiqlash', exact: true }).click();
  await expect(page).toHaveURL(/#\/user\/mashinalar$/);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('newsecurepass');
});

test('recovery never creates an account and changes password only after valid OTP', async ({ page }) => {
  const calls = await backend(page);
  await page.goto('/app/#/parolni-tiklash'); await page.locator('#phone').fill('971234567');
  await page.getByRole('button', { name: 'SMS kod olish' }).click();
  await expect(page.locator('#code')).toBeVisible();
  expect(calls.find(call => call.path.endsWith('/otp')).body.create_user).toBe(false);
  await page.locator('#code').fill('000000'); await page.getByRole('button', { name: 'Tasdiqlash', exact: true }).click();
  await expect(page.locator('#password')).toHaveCount(0);
  expect(calls.filter(call => call.method === 'PUT')).toHaveLength(0);
  await page.locator('#code').fill('123456'); await page.getByRole('button', { name: 'Tasdiqlash', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Yangi parol' })).toBeVisible();
  await page.locator('#password').fill('changedpassword'); await page.locator('#confirm').fill('changedpassword');
  await page.getByRole('button', { name: 'Parolni saqlash' }).click();
  await expect(page.getByRole('heading', { name: 'Parol yangilandi' })).toBeVisible();
  expect(calls.filter(call => call.method === 'PUT' && call.path.endsWith('/user')).map(call => call.body.password)).toEqual(['changedpassword']);
});

test('password change requires the current password and preserves form after wrong password', async ({ page }) => {
  const calls = await backend(page); await login(page); await expect(page).toHaveURL(/user\/mashinalar/);
  await page.goto('/app/#/parol');
  await page.locator('#oldPassword').fill('wrongpass'); await page.locator('#password').fill('newsecurepass'); await page.locator('#confirm').fill('newsecurepass');
  await page.getByRole('button', { name: 'Parolni saqlash' }).click();
  await expect(page.getByRole('alert')).toContainText('noto‘g‘ri');
  expect(calls.filter(call => call.method === 'PUT')).toHaveLength(0);
  await expect(page.locator('#password')).toHaveValue('newsecurepass');
  await page.locator('#oldPassword').fill('correctpass'); await page.getByRole('button', { name: 'Parolni saqlash' }).click();
  await expect(page.getByRole('heading', { name: 'Parol yangilandi' })).toBeVisible();
  expect(calls.filter(call => call.method === 'PUT')).toHaveLength(1);
});


test('unconfirmed login resumes SMS verification and mobile forms fit the viewport', async ({ page }) => {
  const calls = await backend(page, { unconfirmed: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 760 });
  await login(page);
  await expect(page.getByRole('heading', { name: 'Telefonni tasdiqlang' })).toBeVisible();
  expect(calls.filter(call => call.path.endsWith('/resend'))).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/avto-auth-sms.png', fullPage: true });
  await page.locator('#code').fill('123456'); await page.getByRole('button', { name: 'Tasdiqlash', exact: true }).click();
  await expect(page).toHaveURL(/user\/mashinalar/);
  expect(errors).toEqual([]);
});
