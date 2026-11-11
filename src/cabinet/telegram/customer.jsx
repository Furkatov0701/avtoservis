import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadTelegramSession } from './api';
import { useCabinet } from './context';
import { Empty, FormPage, Icon, Notice, PrimaryButton, TextField } from './ui';
import { formatPhone } from './format';

const POLL_INTERVAL = 1500;
const POLL_ATTEMPTS = 20;
const sleep = ms => new Promise(resolve => { setTimeout(resolve, ms); });

// Asks Telegram to send the user's own phone number to the bot. The Mini App never
// trusts the callback: the server links the account only from the bot's webhook.
export function requestContact(app) {
  return new Promise(resolve => {
    if (typeof app?.requestContact !== 'function' || !app.isVersionAtLeast?.('6.9')) { resolve('unsupported'); return; }
    try { app.requestContact(shared => resolve(shared ? 'shared' : 'cancelled')); } catch { resolve('unsupported'); }
  });
}

// Waits until the server reports the expected state after the webhook processed the contact.
async function waitForSession(initData, done, alive) {
  for (let attempt = 0; attempt < POLL_ATTEMPTS && alive(); attempt++) {
    await sleep(POLL_INTERVAL);
    const data = await loadTelegramSession(initData).catch(() => null);
    if (data && done(data)) return data;
  }
  return null;
}

const contactMessages = {
  unsupported: 'Telegram ilovangiz raqam ulashishni qo‘llamaydi. Telegram’ni yangilab, qayta urinib ko‘ring.',
  cancelled: 'Raqam ulashilmadi. Kabinetga kirish uchun telefon raqamingizni ulashing.',
  timeout: 'Raqam hali tasdiqlanmadi. Botdagi xabarni tekshirib, qayta urinib ko‘ring.',
};

function useAlive() {
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  return () => alive.current;
}

export function Register() {
  const { app, session, request, refreshSession } = useCabinet();
  const profile = session.data.profile || {};
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useAlive();
  const submit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get('firstName') || '').trim();
    const lastName = String(form.get('lastName') || '').trim();
    const found = {};
    if (!firstName) found.firstName = 'Ismingizni kiriting.';
    if (!lastName) found.lastName = 'Familiyangizni kiriting.';
    setErrors(found); setFailure('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const result = await requestContact(app);
      if (result !== 'shared') { setFailure(contactMessages[result]); return; }
      const linked = await waitForSession(app.initData, data => data.account === 'ready', alive);
      if (!alive()) return;
      if (!linked) { setFailure(contactMessages.timeout); return; }
      // The name typed here replaces the one copied from Telegram; a failure here is not fatal.
      await request('customer-update-profile', { profile: { firstName, lastName } }).catch(() => {});
      await refreshSession();
    } catch { if (alive()) setFailure('Ro‘yxatdan o‘tib bo‘lmadi. Qayta urinib ko‘ring.'); }
    finally { if (alive()) setBusy(false); }
  };
  return <FormPage title="Akkaunt yaratish" subtitle="User"><form className="tg-form" onSubmit={submit} noValidate>
    <div className="tg-form-row"><TextField label="Ism" name="firstName" required maxLength="80" defaultValue={profile.firstName || ''} placeholder="Ali" autoComplete="given-name" error={errors.firstName} /><TextField label="Familiya" name="lastName" required maxLength="80" defaultValue={profile.lastName || ''} placeholder="Valiyev" autoComplete="family-name" error={errors.lastName} /></div>
    <div className="tg-field"><span className="tg-label">Telefon raqami *</span><p className="tg-contact-box"><Icon name="contact" size={20} /><span>Raqamingiz Telegram orqali xavfsiz ulashiladi. Parol kerak emas.</span></p></div>
    <Notice kind="error">{failure}</Notice>
    {busy && <Notice>Telegram oynasida «Raqamni ulashish»ni tasdiqlang…</Notice>}
    <PrimaryButton type="submit" busy={busy}>Ro‘yxatdan o‘tish</PrimaryButton>
    <Link className="tg-link" to="/yordam">Yordam</Link>
  </form></FormPage>;
}

export function ProfileEdit() {
  const { app, role, session, request, refreshSession, goBack } = useCabinet();
  const navigate = useNavigate();
  const customer = session.data.customer;
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const alive = useAlive();
  if (role === 'admin' || !customer) return <FormPage title="Profilni tahrirlash" subtitle={role === 'admin' ? 'Admin' : 'User'}><Empty title="Profil Telegram’dan olinadi">Administrator ismi Telegram akkauntidagi ma’lumotdan ko‘rsatiladi.</Empty><button type="button" className="tg-link" onClick={goBack}>Orqaga</button></FormPage>;
  const submit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get('firstName') || '').trim();
    const lastName = String(form.get('lastName') || '').trim();
    const found = {};
    if (!firstName) found.firstName = 'Ismingizni kiriting.';
    setErrors(found); setFailure('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await request('customer-update-profile', { profile: { firstName, lastName } });
      await refreshSession();
      if (alive()) navigate('/profil', { replace: true });
    } catch { if (alive()) setFailure('Profilni saqlab bo‘lmadi. Qayta urinib ko‘ring.'); }
    finally { if (alive()) setBusy(false); }
  };
  const changePhone = async () => {
    setFailure(''); setNotice(''); setPhoneBusy(true);
    try {
      const result = await requestContact(app);
      if (result !== 'shared') { setFailure(contactMessages[result]); return; }
      const before = customer.phone;
      const updated = await waitForSession(app.initData, data => data.customer && data.customer.phone !== before, alive);
      if (!alive()) return;
      if (!updated) { setNotice('Raqamingiz o‘zgarmadi yoki hali tasdiqlanmadi. Bot xabarini tekshiring.'); return; }
      await refreshSession();
      setNotice('Telefon raqamingiz yangilandi.');
    } finally { if (alive()) setPhoneBusy(false); }
  };
  return <FormPage title="Profilni tahrirlash" subtitle="User"><form className="tg-form" onSubmit={submit} noValidate>
    <div className="tg-form-row"><TextField label="Ism" name="firstName" required maxLength="80" defaultValue={customer.firstName || ''} autoComplete="given-name" error={errors.firstName} /><TextField label="Familiya" name="lastName" maxLength="80" defaultValue={customer.lastName || ''} autoComplete="family-name" /></div>
    <div className="tg-field"><span className="tg-label">Telefon raqami</span><p className="tg-contact-box"><Icon name="phone" size={20} /><span>{formatPhone(customer.phone) || 'Kiritilmagan'}</span><button type="button" className="tg-chip" onClick={changePhone} disabled={phoneBusy}>{phoneBusy ? 'Kutilmoqda…' : 'Yangilash'}</button></p></div>
    <Notice>{notice}</Notice>
    <Notice kind="error">{failure}</Notice>
    <PrimaryButton type="submit" busy={busy}>Saqlash</PrimaryButton><button type="button" className="tg-link" onClick={goBack}>Bekor qilish</button>
  </form></FormPage>;
}
