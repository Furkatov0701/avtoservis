import React, { useContext, useEffect, useState, createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, Link, Outlet, RouterProvider, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { Button, Field, StateCard } from '../Primitives';
import { botLink, loadTelegramSdk, mountTelegramViewport } from './sdk';
import { loadTelegramSession, telegramRequest } from './api';
import './telegram.css';

const TelegramContext = createContext(null);
const configuredBotLink = botLink(import.meta.env.VITE_TELEGRAM_BOT_USERNAME);

function TelegramLayout() {
  const [status, setStatus] = useState('loading');
  const [app, setApp] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const childPage = location.pathname !== '/';
  useEffect(() => {
    let active = true;
    let detach;
    setStatus('loading');
    loadTelegramSdk().then(sdk => {
      if (!active) return;
      // initData is NOT verified here. No account, role or database access is granted.
      if (typeof sdk.initData !== 'string' || !sdk.initData.trim()) { setStatus('outside'); return; }
      detach = mountTelegramViewport(sdk);
      setApp(sdk); setStatus('inside');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; detach?.(); };
  }, [attempt]);
  useEffect(() => {
    if (!app?.BackButton || !app.isVersionAtLeast?.('6.1')) return;
    const back = () => navigate('/', { replace: true });
    if (childPage) { app.BackButton.onClick(back); app.BackButton.show(); }
    else app.BackButton.hide();
    return () => { app.BackButton.offClick(back); app.BackButton.hide(); };
  }, [app, childPage, navigate]);
  useEffect(() => { document.title = childPage ? 'Yordam — Avto' : 'Avto — Telegram kabinet'; }, [childPage]);
  return <TelegramContext.Provider value={{ status, app }}><div className="telegram-layout"><header className="app-header"><Link className="icon-button" to="/" aria-label="Bosh sahifa"><Icon name={childPage ? 'back' : 'car'} /></Link><strong className="telegram-brand">AVTO</strong><Link className="telegram-help" to="/yordam">Yordam</Link></header><main id="main-content" className="telegram-content">
    {status === 'loading' ? <StateCard kind="loading" title="Ilova ochilmoqda…" /> : status === 'error' ? <StateCard kind="error" title="Telegram bilan bog‘lanib bo‘lmadi" action={<Button onClick={() => setAttempt(value => value + 1)}>Qayta urinish</Button>}>Internet aloqasini tekshirib, qayta urinib ko‘ring.</StateCard> : <Outlet />}
  </main></div></TelegramContext.Provider>;
}

function Welcome() {
  const { status, app } = useContext(TelegramContext);
  const [session, setSession] = useState({ state: 'idle', data: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (status !== 'inside' || !app?.initData) return undefined;
    setSession({ state: 'loading', data: null });
    loadTelegramSession(app.initData).then(data => {
      if (active) setSession({ state: 'ready', data });
    }).catch(() => {
      if (active) setSession({ state: 'error', data: null });
    });
    return () => { active = false; };
  }, [status, app, attempt]);
  const name = session.data?.profile?.firstName || 'siz';
  return <section className="telegram-welcome"><span className="telegram-emblem"><Icon name="car" size={76} /></span><h1>Avto kabinetingiz</h1><p>Avtomobillaringiz va xizmatlar tarixi — Telegram ichida.</p>
    {status === 'outside' ? <StateCard title="Telegram orqali oching" action={configuredBotLink ? <a className="button-primary" href={configuredBotLink} rel="noopener noreferrer">Telegram botni ochish</a> : null}>Servis botidagi «Kabinetni ochish» tugmasidan foydalaning.</StateCard> : session.state === 'loading' || session.state === 'idle' ? <StateCard kind="loading" title="Profil tekshirilmoqda…">Telegram hisobingiz xavfsiz tekshirilmoqda.</StateCard> : session.state === 'error' ? <StateCard kind="error" title="Profilni ulab bo‘lmadi" action={<Button secondary onClick={() => setAttempt(value => value + 1)}>Qayta urinish</Button>}>Aloqani tekshirib, yana urinib ko‘ring.</StateCard> : session.data.role === 'admin' ? <AdminPanel initData={app?.initData} name={name} /> : session.data.account === 'unlinked' ? <StateCard title={`Xush kelibsiz, ${name}`} >Telegram profilingiz ulandi. Servis administratori sizni mijoz kartangizga bog‘lagach, avtomobillaringiz va xizmatlar tarixi shu yerda ko‘rinadi.</StateCard> : <CustomerPanel initData={app?.initData} name={name} />}
  </section>;
}

function AdminPanel({ initData, name }) {
  const [state, setState] = useState({ kind: 'loading', customers: [] });
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  useEffect(() => {
    let active = true;
    setState(current => ({ ...current, kind: 'loading' }));
    telegramRequest(initData, 'admin-dashboard').then(data => {
      if (active) setState({ kind: 'ready', customers: Array.isArray(data.customers) ? data.customers : [] });
    }).catch(() => { if (active) setState({ kind: 'error', customers: [] }); });
    return () => { active = false; };
  }, [initData, reload]);
  const submit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setBusy(true); setNotice('');
    try {
      const data = await telegramRequest(initData, 'admin-create-customer', { customer: {
        firstName: formData.get('firstName'), lastName: formData.get('lastName'), phone: formData.get('phone'),
      } });
      form.reset();
      setState(current => ({ kind: 'ready', customers: [data.customer, ...current.customers] }));
      setSelectedCustomer({ id: data.customer.id, first_name: data.customer.firstName, last_name: data.customer.lastName, phone: data.customer.phone });
      setNotice('Mijoz qo‘shildi. Endi unga avtomobil biriktirish mumkin.');
    } catch { setNotice('Mijozni saqlab bo‘lmadi. Qayta urinib ko‘ring.'); }
    finally { setBusy(false); }
  };
  return <section className="admin-panel"><div className="admin-intro"><span className="admin-badge">ADMIN</span><h2>Xush kelibsiz, {name}</h2><p>Mijozlarni servis bazasiga qo‘shing.</p></div><form className="admin-form" onSubmit={submit}><h3>Yangi mijoz</h3><Field label="Ismi" name="firstName" required maxLength="80" /><Field label="Familiyasi" name="lastName" maxLength="80" /><Field label="Telefon raqami" name="phone" inputMode="tel" maxLength="32" placeholder="+998 90 123 45 67" /><Button busy={busy} type="submit"><Icon name="plus" size={20} /> Mijoz qo‘shish</Button>{notice && <p className="admin-notice" role="status">{notice}</p>}</form><section className="customer-list"><div className="customer-list-heading"><h3>Mijozlar</h3><button className="text-button" type="button" onClick={() => setReload(value => value + 1)}>Yangilash</button></div>{state.kind === 'loading' ? <StateCard kind="loading" title="Mijozlar yuklanmoqda…" /> : state.kind === 'error' ? <StateCard kind="error" title="Ro‘yxatni yuklab bo‘lmadi" action={<Button secondary onClick={() => setReload(value => value + 1)}>Qayta urinish</Button>} /> : state.customers.length === 0 ? <StateCard title="Hali mijoz yo‘q">Yuqoridagi forma orqali birinchi mijozni qo‘shing.</StateCard> : <ul>{state.customers.map(customer => <li key={customer.id}><button className={`customer-button ${selectedCustomer?.id === customer.id ? 'selected' : ''}`} type="button" onClick={() => setSelectedCustomer(customer)}><Icon name="user" size={22} /><span><strong>{[customer.first_name, customer.last_name].filter(Boolean).join(' ')}</strong><small>{customer.phone || 'Telefon raqami kiritilmagan'}</small></span><Icon name="right" size={19} /></button></li>)}</ul>}</section>{selectedCustomer && <VehiclePanel initData={initData} customer={selectedCustomer} />}</section>;
}

function VehiclePanel({ initData, customer }) {
  const [state, setState] = useState({ kind: 'loading', vehicles: [] });
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    let active = true;
    setState({ kind: 'loading', vehicles: [] });
    telegramRequest(initData, 'admin-vehicles', { customerId: customer.id }).then(data => {
      if (active) setState({ kind: 'ready', vehicles: Array.isArray(data.vehicles) ? data.vehicles : [] });
    }).catch(() => { if (active) setState({ kind: 'error', vehicles: [] }); });
    return () => { active = false; };
  }, [initData, customer.id, reload]);
  const submit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setNotice('');
    try {
      const result = await telegramRequest(initData, 'admin-create-vehicle', { customerId: customer.id, vehicle: {
        make: data.get('make'), model: data.get('model'), plate: data.get('plate'), productionYear: data.get('productionYear'),
      } });
      form.reset();
      setState(current => ({ kind: 'ready', vehicles: [result.vehicle, ...current.vehicles] }));
      setNotice('Avtomobil qo‘shildi. Endi unga xizmat yozuvi kiritish mumkin.');
    } catch { setNotice('Avtomobilni saqlab bo‘lmadi. Maydonlarni tekshirib, yana urinib ko‘ring.'); }
    finally { setBusy(false); }
  };
  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ');
  return <section className="vehicle-panel"><div className="customer-context"><Icon name="user" size={20} /><span>Tanlangan mijoz<strong>{customerName}</strong></span></div><form className="admin-form" onSubmit={submit}><h3>Avtomobil qo‘shish</h3><Field label="Markasi" name="make" maxLength="80" placeholder="Chevrolet" /><Field label="Modeli" name="model" required maxLength="100" placeholder="Cobalt" /><Field label="Davlat raqami" name="plate" required maxLength="24" placeholder="01 A 123 BC" /><Field label="Ishlab chiqarilgan yili" name="productionYear" type="number" min="1900" max="2100" inputMode="numeric" placeholder="2022" /><Button busy={busy} type="submit"><Icon name="car" size={20} /> Avtomobil qo‘shish</Button>{notice && <p className="admin-notice" role="status">{notice}</p>}</form><section className="vehicle-list"><div className="customer-list-heading"><h3>Avtomobillar</h3><button className="text-button" type="button" onClick={() => setReload(value => value + 1)}>Yangilash</button></div>{state.kind === 'loading' ? <StateCard kind="loading" title="Avtomobillar yuklanmoqda…" /> : state.kind === 'error' ? <StateCard kind="error" title="Ro‘yxatni yuklab bo‘lmadi" action={<Button secondary onClick={() => setReload(value => value + 1)}>Qayta urinish</Button>} /> : state.vehicles.length === 0 ? <StateCard title="Hali avtomobil yo‘q">Yuqoridagi forma orqali avtomobil qo‘shing.</StateCard> : <ul>{state.vehicles.map(vehicle => <li key={vehicle.id}><button className="customer-button" type="button" onClick={() => setSelected(vehicle)}><Icon name="car" size={23} /><span><strong>{[vehicle.make, vehicle.model].filter(Boolean).join(' ')}</strong><small>{vehicle.plate}{vehicle.production_year || vehicle.productionYear ? ` · ${vehicle.production_year || vehicle.productionYear}` : ''}</small></span><Icon name="right" size={19} /></button></li>)}</ul>}</section>{selected && <ServicePanel initData={initData} vehicle={selected} />}</section>;
}

const serviceNames = { tires: 'Balonlar', engine_oil: 'Motor moyi', antifreeze: 'Antifriz', tint: 'Tonirovka' };

function ServicePanel({ initData, vehicle }) {
  const [records, setRecords] = useState([]);
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const load = () => { setState('loading'); telegramRequest(initData, 'admin-service-records', { vehicleId: vehicle.id }).then(data => { setRecords(data.records || []); setState('ready'); }).catch(() => setState('error')); };
  useEffect(load, [initData, vehicle.id]);
  const submit = async event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setNotice(''); try { const result = await telegramRequest(initData, 'admin-create-service-record', { vehicleId: vehicle.id, record: { serviceType: data.get('serviceType'), performedOn: data.get('performedOn'), nextDueOn: data.get('nextDueOn'), odometerKm: data.get('odometerKm'), notes: data.get('notes') } }); setRecords(current => [result.record, ...current]); form.reset(); setNotice('Xizmat yozuvi saqlandi.'); } catch { setNotice('Xizmat yozuvini saqlab bo‘lmadi.'); } finally { setBusy(false); } };
  return <section className="vehicle-panel"><div className="customer-context"><Icon name="car" size={20} /><span>Tanlangan avtomobil<strong>{[vehicle.make, vehicle.model].filter(Boolean).join(' ')} · {vehicle.plate}</strong></span></div><form className="admin-form" onSubmit={submit}><h3>Xizmat yozuvi</h3><label className="field"><span>Xizmat turi</span><select name="serviceType" required defaultValue=""><option value="" disabled>Tanlang</option>{Object.entries(serviceNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Field label="Bajarilgan sana" name="performedOn" type="date" required /><Field label="Keyingi tavsiya etilgan sana" name="nextDueOn" type="date" /><Field label="Kilometr" name="odometerKm" type="number" min="0" inputMode="numeric" /><label className="field"><span>Izoh</span><textarea name="notes" maxLength="2000" rows="3" /></label><Button busy={busy} type="submit">Xizmatni saqlash</Button>{notice && <p className="admin-notice" role="status">{notice}</p>}</form><RecordList records={records} state={state} retry={load} /></section>;
}

function RecordList({ records, state, retry }) {
  if (state === 'loading') return <StateCard kind="loading" title="Xizmatlar yuklanmoqda…" />;
  if (state === 'error') return <StateCard kind="error" title="Xizmatlar yuklanmadi" action={<Button secondary onClick={retry}>Qayta urinish</Button>} />;
  if (!records.length) return <StateCard title="Hali xizmat yozuvi yo‘q" />;
  return <section className="vehicle-list"><h3>Xizmat tarixi</h3><ul>{records.map(record => <li key={record.id}><Icon name="car" size={23} /><span><strong>{serviceNames[record.service_type] || record.service_type} · {record.performed_on}</strong><small>{record.next_due_on ? `Keyingi sana: ${record.next_due_on}` : 'Keyingi sana ko‘rsatilmagan'}{record.odometer_km ? ` · ${record.odometer_km} km` : ''}</small></span></li>)}</ul></section>;
}

function CustomerPanel({ initData, name }) {
  const [state, setState] = useState('loading');
  const [vehicles, setVehicles] = useState([]);
  const load = () => { setState('loading'); telegramRequest(initData, 'customer-vehicles').then(data => { setVehicles(data.vehicles || []); setState('ready'); }).catch(() => setState('error')); };
  useEffect(load, [initData]);
  return <section className="telegram-welcome"><span className="telegram-emblem"><Icon name="car" size={76} /></span><h1>Xush kelibsiz, {name}</h1><p>Avtomobillaringiz va xizmatlar tarixi.</p>{state === 'loading' ? <StateCard kind="loading" title="Ma’lumotlar yuklanmoqda…" /> : state === 'error' ? <StateCard kind="error" title="Ma’lumotlarni yuklab bo‘lmadi" action={<Button secondary onClick={load}>Qayta urinish</Button>} /> : !vehicles.length ? <StateCard title="Hali avtomobil yo‘q">Servis administratori avtomobilingizni biriktirgach, u shu yerda ko‘rinadi.</StateCard> : vehicles.map(vehicle => <section className="vehicle-panel" key={vehicle.id}><div className="customer-context"><Icon name="car" size={20} /><span>Avtomobil<strong>{[vehicle.make, vehicle.model].filter(Boolean).join(' ')} · {vehicle.plate}</strong></span></div><RecordList records={vehicle.service_records || []} state="ready" retry={load} /></section>)}</section>;
}

function Help() {
  return <section className="telegram-guide"><h1>Qanday foydalaniladi?</h1><ol><li>Servisning Telegram botini oching.</li><li>«Kabinetni ochish» tugmasini bosing.</li><li>Kabinet ishga tushgach, avtomobillaringiz va xizmatlar tarixini ko‘rishingiz mumkin.</li></ol><p>Kabinet hozir tayyorlanmoqda. Alohida parol yaratish talab qilinmaydi.</p><Link className="button-secondary" to="/">Bosh sahifaga qaytish</Link></section>;
}

export function startTelegram() {
  // Telegram owns the URL hash for launch data. Keep application navigation in memory.
  const initialPath = window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '/';
  const router = createMemoryRouter([{ element: <TelegramLayout />, children: [
    { path: '/', element: <Welcome /> },
    { path: '/yordam', element: <Help /> },
    { path: '*', element: <StateCard title="Sahifa topilmadi" action={<Link className="button-primary" to="/">Bosh sahifaga</Link>} /> },
  ] }], { initialEntries: [initialPath] });
  createRoot(document.getElementById('root')).render(<React.StrictMode><RouterProvider router={router} /></React.StrictMode>);
}
