import { test, expect } from '@playwright/test';
import { screenOptions } from '../../src/cabinet/demo.js';

test('all preview screens load without JS errors; unknown screens have a fallback', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [path] of screenOptions) {
    await page.goto(`/app/#${path}${path.includes('/xizmatlar/') ? '?car=sample-1' : ''}`);
    await expect(page.locator('.app-surface')).toBeVisible();
    await expect(page.locator('.app-surface h1')).toHaveCount(1);
  }
  await page.goto('/app/#/not-a-page');
  await expect(page.getByRole('heading', { name: 'Sahifa topilmadi' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('user navigation requires a car, preserves selection and exposes no service writing action', async ({ page }) => {
  await page.goto('/app/#/user/xizmatlar');
  await expect(page.getByRole('heading', { name: 'Avval avtomobilni tanlang' })).toBeVisible();
  await page.getByRole('link', { name: 'Mashinalarni ochish' }).click();
  await expect(page.locator('.car-tile')).toHaveCount(3);
  await page.locator('.car-tile').filter({ hasText: 'Chevrolet Cobalt' }).click();
  await expect(page.locator('.vehicle-context')).toContainText('Chevrolet Cobalt');
  await page.getByRole('link', { name: 'Motor moyi', exact: true }).click();
  await expect(page.locator('.date-card')).toContainText('12 iyun 2026');
  await expect(page.locator('.add-service')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.vehicle-context')).toContainText('Chevrolet Cobalt');
  await page.getByLabel('Xizmat turini tanlang').selectOption('antifriz');
  await expect(page).toHaveURL(/xizmatlar\/antifriz\?car=sample-2/);
  await page.getByRole('button', { name: 'Xizmatlar tarixi' }).click();
  await expect(page.locator('.history-list')).toContainText('Chevrolet Cobalt');
  await expect(page.locator('.bottom-nav .nav-item')).toHaveCount(3);
  await page.goto('/app/#/user/xizmatlar?car=sample-other-not-owned');
  await expect(page.getByRole('heading', { name: 'Avval avtomobilni tanlang' })).toBeVisible();
});

test('admin search and pagination work without creating extra demo rows', async ({ page }) => {
  await page.goto('/app/#/admin/mijozlar');
  await expect(page.locator('.bottom-nav .nav-item')).toHaveCount(5);
  await expect(page.locator('tbody tr')).toHaveCount(6);
  await page.getByRole('button', { name: 'Yana…' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(11);
  await expect(page.getByRole('button', { name: 'Yana…' })).toHaveCount(0);
  await page.getByRole('searchbox').fill('Mijoz 11');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('searchbox').fill('no-such-client');
  await expect(page.getByRole('heading', { name: 'Mijoz topilmadi' })).toBeVisible();
  await page.goto('/app/#/admin/xizmatlar/motor-moyi?car=sample-1');
  await page.getByRole('button', { name: 'Xizmat yozuvi qo‘shish' }).click();
  await expect(page.locator('dialog[open]')).toContainText('Xizmatni faqat admin kiritadi');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('form validates, reveals passwords, warns before exit and never pretends to authenticate', async ({ page }) => {
  const submissions = [];
  page.on('request', request => { if (request.method() === 'POST') submissions.push(request.url()); });
  await page.goto('/app/#/royxatdan-otish');
  await page.getByRole('button', { name: 'Ro‘yxatdan o‘tish', exact: true }).click();
  await expect(page.locator('#firstName-error')).toBeVisible();
  await page.locator('#firstName').fill('Namuna');
  await page.locator('#lastName').fill('Foydalanuvchi');
  await page.locator('#phone').fill('90 123 45 67');
  await page.locator('#password').fill('ui-test-only');
  await page.locator('#confirm').fill('does-not-match');
  await page.getByRole('button', { name: 'Ro‘yxatdan o‘tish', exact: true }).click();
  await expect(page.locator('#confirm-error')).toHaveText('Parollar bir xil emas.');
  await page.getByRole('button', { name: 'Parol: ko‘rsatish', exact: true }).click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await page.locator('#confirm').fill('ui-test-only');
  await page.getByRole('button', { name: 'Ro‘yxatdan o‘tish', exact: true }).click();
  await expect(page.locator('.form-notice')).toContainText('serverga yuborilmadi');
  await expect(page.locator('#phone')).toHaveValue('+998901234567');
  await expect(page.locator('#firstName')).toHaveValue('Namuna');
  await page.getByRole('link', { name: 'Akkauntingiz bormi? Kirish' }).click();
  await expect(page.locator('dialog[open]')).toContainText('saqlanmagan');
  await page.getByRole('button', { name: 'Qolish', exact: true }).click();
  await expect(page.locator('#firstName')).toHaveValue('Namuna');
  await page.getByRole('link', { name: 'Akkauntingiz bormi? Kirish' }).click();
  await page.getByRole('button', { name: 'Chiqish', exact: true }).click();
  await expect(page).toHaveURL(/#\/kirish$/);
  expect(submissions).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('empty, loading, error and denied UI states are selectable; retry restores fixture', async ({ page }) => {
  await page.goto('/app/#/user/mashinalar');
  await page.locator('.preview-controls summary').click();
  const select = page.getByLabel('Ma’lumot holati');
  for (const [value, heading] of [['empty', 'Avtomobillar hali yo‘q'], ['loading', 'Yuklanmoqda…'], ['error', 'Ma’lumotni yuklab bo‘lmadi'], ['denied', 'Ruxsat yo‘q']]) {
    await select.selectOption(value);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  await select.selectOption('error');
  await page.getByRole('button', { name: 'Qayta urinish' }).click();
  await expect(page.locator('.car-tile')).toHaveCount(3);
});

test('mobile surfaces fit 320–430 px and navigation does not cover the last card', async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/royxatdan-otish', '/admin/mijozlar', '/user/mashinalar', '/user/xizmatlar?car=sample-1', '/user/profil?car=sample-1']) {
      await page.goto(`/app/#${route}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const small = await page.locator('.app-surface button, .app-surface a').evaluateAll(items => items.filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.width < 43.5 || r.height < 43.5); }).map(e => e.textContent || e.getAttribute('aria-label')));
      expect(small).toEqual([]);
    }
  }
  await page.goto('/app/#/user/xizmatlar?car=sample-1');
  const last = await page.locator('.service-tile').last().boundingBox();
  const nav = await page.locator('.bottom-nav').boundingBox();
  expect(last.y + last.height).toBeLessThanOrEqual(nav.y);
});

test('existing landing entry still renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Har kilometrda');
  await expect(page.locator('.service-card')).toHaveCount(6);
});
