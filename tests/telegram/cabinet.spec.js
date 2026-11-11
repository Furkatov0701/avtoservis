import { test, expect } from '@playwright/test';

// Screens are saved here for a side-by-side check with the approved design.
const SHOTS = process.env.AVTO_SHOTS_DIR || 'test-results/screens';
const Y = new Date().getFullYear();
// Dates relative to today, in the browser's local calendar, so statuses never depend on the run date.
const d = offset => { const t = new Date(); t.setDate(t.getDate() + offset); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const ids = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function sdk(page, { contact = 'shared' } = {}) {
  await page.route('https://telegram.org/js/telegram-web-app.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    window.backCallbacks = new Set(); window.contactRequests = 0; window.closeCalls = 0;
    window.Telegram = { WebApp: {
      initData: 'signed-by-test-server', initDataUnsafe: { user: { id: 1, first_name: 'Forged', role: 'admin' } },
      viewportStableHeight: 844, safeAreaInset: {}, contentSafeAreaInset: {},
      isVersionAtLeast: () => true, ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {}, onEvent() {}, offEvent() {},
      requestContact(callback) { window.contactRequests++; setTimeout(() => callback(${contact === 'shared'}), 10); },
      close() { window.closeCalls++; },
      BackButton: { show() { window.backVisible = true; }, hide() { window.backVisible = false; }, onClick: fn => backCallbacks.add(fn), offClick: fn => backCallbacks.delete(fn) }
    }};` }));
}

// Stand-in for the Edge Function. Role and account always come from this "server".
async function api(page, state) {
  const calls = [];
  await page.route('**/functions/v1/telegram-bot', async route => {
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'content-type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const body = route.request().postDataJSON();
    calls.push(body);
    const ok = data => route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ...data }) });
    const fail = (status, error) => route.fulfill({ status, headers, body: JSON.stringify({ error }) });
    switch (body.action) {
      case 'miniapp-session': {
        state.onSession?.(state);
        const customer = state.customer || null;
        return ok({ role: state.role, account: customer ? 'ready' : 'unlinked', profile: state.profile, customer });
      }
      case 'admin-dashboard': return state.role === 'admin' ? ok({ customers: state.customers }) : fail(403, 'admin_required');
      case 'admin-overview': {
        if (state.role !== 'admin') return fail(403, 'admin_required');
        const today = Date.parse(`${d(0)}T00:00:00Z`);
        const due = state.vehicles.flatMap(vehicle => ['tires', 'engine_oil', 'antifreeze', 'tint'].map(type => {
          const latest = vehicle.service_records.filter(r => r.service_type === type).sort((a, b) => b.performed_on.localeCompare(a.performed_on))[0];
          if (!latest?.next_due_on) return null;
          const days = Math.round((Date.parse(`${latest.next_due_on}T00:00:00Z`) - today) / 86400000);
          const owner = state.customers.find(c => c.id === vehicle.customer_id) || { id: vehicle.customer_id, first_name: 'Paloncha', last_name: 'Palonchayev' };
          return days <= 7 ? { id: latest.id, serviceType: type, nextDueOn: latest.next_due_on, days, vehicle: { id: vehicle.id, model: vehicle.model, plate: vehicle.plate }, customer: owner } : null;
        })).filter(Boolean).sort((a, b) => a.days - b.days);
        return ok({ stats: { customers: state.customers.length, thisWeek: due.filter(x => x.days >= 0).length, overdue: due.filter(x => x.days < 0).length }, due });
      }
      case 'admin-create-customer': {
        if (state.customers.some(item => item.phone === body.customer.phone)) return fail(409, 'customer_exists');
        const customer = { id: ids(900 + state.customers.length), firstName: body.customer.firstName, lastName: body.customer.lastName, phone: body.customer.phone };
        state.customers.unshift({ id: customer.id, first_name: customer.firstName, last_name: customer.lastName, phone: customer.phone, linked: false });
        return ok({ customer });
      }
      case 'admin-vehicles': return ok({ vehicles: state.vehicles.filter(vehicle => !body.customerId || vehicle.customer_id === body.customerId) });
      case 'admin-create-vehicle': {
        const vehicle = { id: ids(800 + state.vehicles.length), customer_id: body.customerId, make: body.vehicle.make, model: body.vehicle.model, plate: body.vehicle.plate.toUpperCase(), production_year: null, service_records: [] };
        state.vehicles.unshift(vehicle);
        return ok({ vehicle: { id: vehicle.id, make: vehicle.make, model: vehicle.model, plate: vehicle.plate } });
      }
      case 'admin-service-records': return ok({ records: state.vehicles.find(vehicle => vehicle.id === body.vehicleId)?.service_records || [] });
      case 'admin-create-service-record': {
        const vehicle = state.vehicles.find(item => item.id === body.vehicleId);
        const r = body.record;
        const wheels = r.tirePositions ? Object.fromEntries(Object.entries(r.tirePositions).map(([key, value]) => [key, value || null])) : null;
        const record = { id: ids(700 + vehicle.service_records.length), service_type: r.serviceType, performed_on: r.performedOn, next_due_on: r.nextDueOn || (wheels ? Object.values(wheels).filter(Boolean).sort()[0] : null), tire_positions: wheels };
        vehicle.service_records.unshift(record);
        return ok({ record });
      }
      case 'customer-vehicles': return state.customer ? ok({ vehicles: state.vehicles }) : ok({ account: 'unlinked', vehicles: [] });
      case 'customer-update-profile': {
        if (!state.customer) return fail(403, 'customer_required');
        Object.assign(state.customer, { firstName: body.profile.firstName, lastName: body.profile.lastName });
        return ok({ customer: state.customer });
      }
      default: return fail(400, 'invalid_action');
    }
  });
  return calls;
}

const malibu = () => ({ id: ids(1), customer_id: ids(11), make: 'Chevrolet', model: 'Malibu 2', plate: '30UUU111', production_year: 2021, customers: { first_name: 'Paloncha', last_name: 'Palonchayev' }, service_records: [
  { id: ids(101), service_type: 'tires', performed_on: d(-194), next_due_on: d(12), odometer_km: 72000, tire_positions: { front_left: d(12), front_right: d(12), rear_left: d(119), rear_right: d(119) } },
  { id: ids(102), service_type: 'antifreeze', performed_on: d(-10), next_due_on: d(180), odometer_km: 85000 },
  { id: ids(103), service_type: 'engine_oil', performed_on: d(-194), next_due_on: d(-8), odometer_km: 72000 },
  { id: ids(104), service_type: 'tint', performed_on: d(-60), next_due_on: d(60) },
] });

test.use({ viewport: { width: 390, height: 844 } });

test('admin: home, customers table, adding a customer, a car and a tire record', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const customers = Array.from({ length: 10 }, (_, i) => ({ id: ids(11 + i), first_name: i % 2 ? 'Aliyev' : 'Paloncha', last_name: i % 2 ? 'Valijon' : 'Palonchayev', phone: `+99890000000${i}`, linked: i === 0 }));
  const state = { role: 'admin', profile: { firstName: 'Bosh', lastName: 'Admin' }, customer: null, customers, vehicles: [malibu()] };
  const calls = await api(page, state);
  await sdk(page); await page.goto('/app/');

  // Home: promotion only, five icon-only menu items, no back button.
  await expect(page.getByText('15 % — AKSIYA')).toBeVisible();
  await expect(page.locator('.tg-role')).toHaveText('Admin');
  await expect(page.getByRole('button', { name: 'Orqaga qaytish' })).toHaveCount(0);
  await expect(page.locator('.tg-nav a')).toHaveCount(5);
  await expect(page.locator('.tg-stats')).toContainText('10MIJOZ');
  await expect(page.locator('.tg-stats .late')).toContainText('1');
  await expect(page.getByRole('button', { name: /Motor moyi · Malibu 2/ })).toContainText('8 kun o‘tdi');
  await page.screenshot({ path: `${SHOTS}/03-admin-bosh.png` });

  // Customers: numbered table, "Ko‘rish" chips, eight rows per page and "Yana....".
  await page.getByRole('link', { name: 'Mijozlar' }).click();
  await expect(page.getByRole('table', { name: 'Mijozlar ro‘yxati' })).toBeVisible();
  await expect(page.getByRole('button', { name: /ko‘rish$/ })).toHaveCount(6);
  await page.screenshot({ path: `${SHOTS}/04-admin-mijozlar.png` });
  await page.getByRole('button', { name: 'Yana....' }).click();
  await expect(page.getByRole('button', { name: /ko‘rish$/ })).toHaveCount(10);
  await page.getByLabel('Ism yoki telefon bo‘yicha mijoz qidirish').fill('aliyev');
  await expect(page.getByRole('button', { name: /ko‘rish$/ })).toHaveCount(5);
  await expect(page.locator('tr.empty')).toHaveCount(0);
  await expect(page.locator('.tg-table')).toContainText('Botga ulanmagan');

  // Add customer: validation, duplicate phone, then success.
  await page.getByRole('link', { name: 'Mijoz qo‘shish' }).click();
  await expect(page.getByRole('heading', { name: 'Mijoz qo‘shish' })).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/05-admin-mijoz-qoshish.png` });
  await page.getByRole('button', { name: 'Qo‘shish' }).click();
  await expect(page.getByText('Ismni kiriting.')).toBeVisible();
  await expect(page.getByText('Raqamni +998 va 9 ta raqam bilan kiriting.')).toBeVisible();
  await page.getByLabel('Ism *').fill('Sardor'); await page.getByLabel('Familiya *').fill('Karimov');
  await page.getByLabel('Telefon raqami *').fill('900000000');
  await expect(page.getByLabel('Telefon raqami *')).toHaveValue('+998 (90) 000-00-00');
  await page.getByRole('button', { name: 'Qo‘shish' }).click();
  await expect(page.getByRole('alert')).toHaveText('Bu telefon raqami bilan mijoz allaqachon qo‘shilgan.');
  await page.getByLabel('Telefon raqami *').fill('+998 93 555 44 33');
  await page.getByRole('button', { name: 'Qo‘shish' }).click();
  expect(calls.find(call => call.action === 'admin-create-customer' && call.customer.phone === '+998935554433')).toBeTruthy();

  // The new customer is selected; the admin adds a car with the green "+".
  await expect(page.locator('.tg-context')).toContainText('Sardor Karimov');
  await expect(page.getByText('Hali mashina yo‘q')).toBeVisible();
  await page.getByRole('link', { name: 'Mashina qo‘shish' }).click();
  await page.getByLabel('Modeli *').fill('Cobalt'); await page.getByLabel('Davlat raqami *').fill('01 a 123 bc');
  await page.getByRole('button', { name: 'Qo‘shish' }).click();
  await expect(page.getByRole('button', { name: /COBALT/ })).toBeVisible();

  // All cars, then the design's car grid and the sections list with next dates.
  await page.getByRole('button', { name: 'Barcha mashinalar' }).click();
  await expect(page.getByRole('button', { name: /MALIBU 2/ })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/06-admin-mashinalar.png` });
  await page.getByRole('button', { name: /MALIBU 2/ }).click();
  await expect(page.getByRole('link', { name: 'Balonlar: 12 kun qoldi' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Motor moyi: 8 kun kechikdi' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/07-admin-bolimlar.png` });

  // Tire detail and a new record with per-wheel dates.
  await page.getByRole('link', { name: 'Balonlar: 12 kun qoldi' }).click();
  await expect(page.locator('.tg-wheel')).toHaveCount(4);
  await expect(page.locator('.tg-tyre.soon')).toHaveCount(2);
  await page.screenshot({ path: `${SHOTS}/admin-balonlar.png` });
  await page.getByRole('link', { name: 'Yozuv qo‘shish' }).click();
  await page.getByLabel('Bajarilgan sana *').fill(d(0));
  await page.getByLabel('Old chap').fill(d(-5));
  await page.getByRole('button', { name: 'Saqlash' }).click();
  await expect(page.getByText('Bajarilgan sanadan oldin bo‘lmasin.')).toBeVisible();
  await page.getByLabel('Old chap').fill(`${Y + 1}-01-15`);
  await page.screenshot({ path: `${SHOTS}/admin-xizmat-yozuvi.png` });
  await page.getByRole('button', { name: 'Saqlash' }).click();
  await expect(page.locator('.tg-wheel.front_left')).toContainText(`15 YANVAR ${Y + 1}`);
  const saved = calls.find(call => call.action === 'admin-create-service-record');
  expect(saved.record.tirePositions).toEqual({ front_left: `${Y + 1}-01-15`, front_right: '', rear_left: '', rear_right: '' });

  // The Telegram back button walks back through the app.
  expect(await page.evaluate(() => backVisible)).toBe(true);
  await page.evaluate(() => [...backCallbacks].forEach(fn => fn()));
  await expect(page.getByRole('link', { name: /^Balonlar: / })).toBeVisible();
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('customer: cars, sections, service dates, tires, profile and editing', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const second = { ...malibu(), id: ids(2), model: 'Cobalt', plate: '01A123BC', service_records: [] };
  const state = { role: 'user', profile: { firstName: 'Paloncha', lastName: '' }, customer: { id: ids(11), firstName: 'Paloncha', lastName: 'Palonchayev', phone: '+998909999999' }, customers: [], vehicles: [malibu(), second] };
  const calls = await api(page, state);
  await sdk(page); await page.goto('/app/');
  await expect(page.locator('.tg-role')).toHaveText('User');
  // Customers have no customer list: the third menu item is their profile.
  await expect(page.getByRole('link', { name: 'Mijozlar' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Profil' }).first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Motor moyi muddati 8 kun oldin o‘tgan');
  await expect(page.getByRole('link', { name: 'Balonlar: 12 kun qoldi' })).toBeVisible();
  await expect(page.locator('.tg-hero')).toContainText('85 000 km · 2021');
  await page.screenshot({ path: `${SHOTS}/user-bosh.png` });

  await page.getByRole('link', { name: 'Mashinalar' }).click();
  await expect(page.locator('.tg-grid').getByRole('button', { name: /MALIBU 2/ })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/10-user-mashinalar.png` });
  await page.locator('.tg-grid').getByRole('button', { name: /MALIBU 2/ }).click();
  await expect(page.locator('.tg-svc')).toHaveCount(4);
  await page.screenshot({ path: `${SHOTS}/11-user-bolimlar.png` });

  await page.getByRole('link', { name: 'Antifriz: 180 kun qoldi' }).click();
  await expect(page.locator('.tg-next')).toContainText('180 kun qoldi');
  await expect(page.locator('.tg-hist')).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/13-user-antifriz.png` });
  await page.getByLabel('Xizmat turini tanlang').selectOption('tires');
  await expect(page.locator('.tg-wheel')).toHaveCount(4);
  await expect(page.locator('.tg-wheel.rear_left')).toContainText('119 kun');
  await page.screenshot({ path: `${SHOTS}/12-user-balonlar.png` });
  await expect(page.getByRole('link', { name: 'Yozuv qo‘shish' })).toHaveCount(0);

  // Profile card: name, car with plate, phone, edit and exit.
  await page.getByRole('link', { name: 'Profil' }).first().click();
  await expect(page.getByRole('heading', { name: 'PALONCHA PALONCHAYEV' })).toBeVisible();
  await expect(page.getByLabel('Davlat raqami 30 UUU111')).toBeVisible();
  await expect(page.getByText('+998 (90) 999-99-99')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/16-user-profil.png` });
  await page.getByRole('button', { name: 'CHIQISH' }).click();
  expect(await page.evaluate(() => closeCalls)).toBe(1);
  await page.getByRole('link', { name: 'TAHRIRLASH' }).click();
  await page.getByLabel('Ism *').fill('Alisher');
  await page.getByRole('button', { name: 'Saqlash' }).click();
  await expect(page.getByRole('heading', { name: 'ALISHER PALONCHAYEV' })).toBeVisible();
  expect(calls.find(call => call.action === 'customer-update-profile').profile).toEqual({ firstName: 'Alisher', lastName: 'Palonchayev' });
  expect(calls.some(call => call.action.startsWith('admin-'))).toBe(false);
  expect(errors).toEqual([]);
});

test('customer pages cannot open admin screens, even by URL', async ({ page }) => {
  const state = { role: 'user', profile: { firstName: 'A' }, customer: { id: ids(11), firstName: 'A', lastName: '', phone: '+998901234567' }, customers: [], vehicles: [] };
  const calls = await api(page, state);
  await sdk(page); await page.goto('/app/#/mijozlar');
  await expect(page.getByRole('heading', { name: 'Sahifa topilmadi' })).toBeVisible();
  await expect(page.locator('table')).toHaveCount(0);
  expect(calls.some(call => call.action === 'admin-dashboard')).toBe(false);
});

test('first visit: registration without a password links the account through the shared contact', async ({ page }) => {
  let sessions = 0;
  const state = { role: 'user', profile: { firstName: 'Ali', lastName: '' }, customer: null, customers: [], vehicles: [],
    // The bot webhook links the card after the contact is shared (second session request onward).
    onSession: current => { sessions++; if (sessions >= 3 && !current.customer) current.customer = { id: ids(11), firstName: 'Ali', lastName: '', phone: '+998901234567' }; } };
  const calls = await api(page, state);
  await sdk(page); await page.goto('/app/');
  await expect(page.getByRole('heading', { name: 'Akkaunt yaratish' })).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  await expect(page.getByLabel('Ism *')).toHaveValue('Ali');
  await page.screenshot({ path: `${SHOTS}/08-user-akkaunt-yaratish.png` });
  await page.getByRole('button', { name: 'Ro‘yxatdan o‘tish' }).click();
  await expect(page.getByText('Familiyangizni kiriting.')).toBeVisible();
  expect(await page.evaluate(() => contactRequests)).toBe(0);
  await page.getByLabel('Familiya *').fill('Valiyev');
  await page.getByRole('button', { name: 'Ro‘yxatdan o‘tish' }).click();
  await expect(page.locator('.tg-role')).toHaveText('User', { timeout: 15000 });
  expect(await page.evaluate(() => contactRequests)).toBe(1);
  expect(calls.find(call => call.action === 'customer-update-profile').profile).toEqual({ firstName: 'Ali', lastName: 'Valiyev' });
});

test('registration explains a declined contact and stays on the form', async ({ page }) => {
  await api(page, { role: 'user', profile: { firstName: 'Ali', lastName: 'Valiyev' }, customer: null, customers: [], vehicles: [] });
  await sdk(page, { contact: 'declined' }); await page.goto('/app/');
  await page.getByRole('button', { name: 'Ro‘yxatdan o‘tish' }).click();
  await expect(page.getByRole('alert')).toHaveText('Raqam ulashilmadi. Kabinetga kirish uchun telefon raqamingizni ulashing.');
  await expect(page.getByRole('heading', { name: 'Akkaunt yaratish' })).toBeVisible();
});
