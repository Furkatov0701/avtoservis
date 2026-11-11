import '@fontsource-variable/manrope';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, Link, Outlet, RouterProvider, useLocation, useNavigate } from 'react-router-dom';
import { botLink, loadTelegramSdk, mountTelegramViewport } from './sdk';
import { loadTelegramSession, telegramRequest } from './api';
import { CabinetContext, useCabinet } from './context';
import { BottomNav, Empty, Header, Icon, PrimaryButton } from './ui';
import { initials } from './format';
import { Home, Vehicles, Sections, ServiceDetail, Profile, Settings, Help, NotFound } from './pages';
import { Customers, CustomerCreate, VehicleCreate, RecordForm } from './admin';
import { Register, ProfileEdit } from './customer';
import './telegram.css';

const configuredBotLink = botLink(import.meta.env.VITE_TELEGRAM_BOT_USERNAME);

const adminMenu = [
  { to: '/', icon: 'home', label: 'Bosh sahifa', short: 'Bosh' },
  { to: '/mashinalar', icon: 'car', label: 'Mashinalar', short: 'Mashina' },
  { to: '/mijozlar', icon: 'people', label: 'Mijozlar', short: 'Mijozlar' },
  { to: '/bolimlar', icon: 'layers', label: 'Bo‘limlar', short: 'Bo‘limlar' },
  { to: '/sozlamalar', icon: 'settings', label: 'Sozlamalar', short: 'Sozlama' },
];
const userMenu = [
  { to: '/', icon: 'home', label: 'Bosh sahifa', short: 'Bosh' },
  { to: '/mashinalar', icon: 'car', label: 'Mashinalar', short: 'Mashina' },
  { to: '/profil', icon: 'people', label: 'Profil', short: 'Profil' },
  { to: '/bolimlar', icon: 'layers', label: 'Bo‘limlar', short: 'Bo‘limlar' },
  { to: '/sozlamalar', icon: 'settings', label: 'Sozlamalar', short: 'Sozlama' },
];

function useLoader(load) {
  const [state, setState] = useState({ kind: 'idle', data: null });
  const run = useCallback(() => {
    setState(current => ({ kind: 'loading', data: current.data }));
    return load().then(data => { setState({ kind: 'ready', data }); return data; }, error => { setState(current => ({ kind: 'error', data: current.data })); throw error; });
  }, [load]);
  return [state, run, setState];
}

function TelegramLayout() {
  const [status, setStatus] = useState('loading');
  const [app, setApp] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState({ state: 'idle', data: null });
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [adminVehicles, setAdminVehicles] = useState({ key: null, kind: 'idle', list: [] });
  const [recordCache, setRecordCache] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const initData = app?.initData;

  useEffect(() => {
    let active = true;
    let detach;
    setStatus('loading');
    loadTelegramSdk().then(sdk => {
      if (!active) return;
      // initData is verified only by the server. The SDK alone never grants an account or role.
      if (typeof sdk.initData !== 'string' || !sdk.initData.trim()) { setStatus('outside'); return; }
      detach = mountTelegramViewport(sdk);
      setApp(sdk); setStatus('inside');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; detach?.(); };
  }, [attempt]);

  useEffect(() => {
    let active = true;
    if (status !== 'inside' || !initData) return undefined;
    setSession({ state: 'loading', data: null });
    loadTelegramSession(initData).then(data => { if (active) setSession({ state: 'ready', data }); }, () => { if (active) setSession({ state: 'error', data: null }); });
    return () => { active = false; };
  }, [status, initData, sessionAttempt]);

  const refreshSession = useCallback(async () => {
    const data = await loadTelegramSession(initData);
    setSession({ state: 'ready', data });
    return data;
  }, [initData]);

  const request = useCallback((action, data) => telegramRequest(initData, action, data), [initData]);
  const role = session.data?.role;
  const [customers, loadCustomers, setCustomers] = useLoader(useCallback(() => request('admin-dashboard').then(data => data.customers || []), [request]));
  const [overview, loadOverview] = useLoader(useCallback(() => request('admin-overview'), [request]));
  const [userVehicles, loadUserVehicles] = useLoader(useCallback(() => request('customer-vehicles').then(data => data.vehicles || []), [request]));

  const loadAdminVehicles = useCallback(async () => {
    const key = selectedCustomer?.id || 'all';
    setAdminVehicles(current => ({ key, kind: 'loading', list: current.key === key ? current.list : [] }));
    try {
      const data = await request('admin-vehicles', selectedCustomer ? { customerId: selectedCustomer.id } : {});
      setAdminVehicles({ key, kind: 'ready', list: data.vehicles || [] });
    } catch { setAdminVehicles(current => ({ ...current, key, kind: 'error' })); }
  }, [request, selectedCustomer]);

  const loadRecords = useCallback(async vehicleId => {
    setRecordCache(current => ({ ...current, [vehicleId]: { kind: 'loading', list: current[vehicleId]?.list || [] } }));
    try {
      const data = await request('admin-service-records', { vehicleId });
      setRecordCache(current => ({ ...current, [vehicleId]: { kind: 'ready', list: data.records || [] } }));
    } catch { setRecordCache(current => ({ ...current, [vehicleId]: { kind: 'error', list: current[vehicleId]?.list || [] } })); }
  }, [request]);

  // Vehicles visible to the current role. A customer with one car has it selected automatically.
  const vehicles = role === 'admin' ? adminVehicles.list : userVehicles.data || [];
  const selectedVehicle = vehicles.find(vehicle => vehicle.id === selectedVehicleId) || (role === 'user' && vehicles.length === 1 ? vehicles[0] : null);

  const goBack = useCallback(() => {
    if (location.key === 'default') navigate('/', { replace: true });
    else navigate(-1);
  }, [location.key, navigate]);

  const childPage = location.pathname !== '/';
  useEffect(() => {
    if (!app?.BackButton || !app.isVersionAtLeast?.('6.1')) return undefined;
    if (childPage) { app.BackButton.onClick(goBack); app.BackButton.show(); }
    else app.BackButton.hide();
    return () => { app.BackButton.offClick(goBack); app.BackButton.hide(); };
  }, [app, childPage, goBack]);
  useEffect(() => { window.scrollTo?.(0, 0); }, [location.pathname]);

  const selectCustomer = useCallback(customer => { setSelectedCustomer(customer); setSelectedVehicleId(null); }, []);
  const value = useMemo(() => ({
    status, app, session, role, retrySdk: () => setAttempt(n => n + 1), retrySession: () => setSessionAttempt(n => n + 1), refreshSession, request, goBack,
    customers, loadCustomers, setCustomers, selectedCustomer, selectCustomer, overview, loadOverview,
    userVehicles, loadUserVehicles, adminVehicles, loadAdminVehicles, vehicles, selectedVehicle, selectVehicle: setSelectedVehicleId,
    recordCache, loadRecords,
  }), [status, app, session, role, refreshSession, request, goBack, customers, loadCustomers, setCustomers, selectedCustomer, selectCustomer, overview, loadOverview, userVehicles, loadUserVehicles, adminVehicles, loadAdminVehicles, vehicles, selectedVehicle, recordCache, loadRecords]);

  return <CabinetContext.Provider value={value}><div className="tg-app"><main id="main-content" className="tg-main"><Outlet /></main></div></CabinetContext.Provider>;
}

// Shown until the server has verified the Telegram identity.
function Welcome({ children }) {
  return <section className="tg-welcome"><span className="tg-logo" aria-hidden="true"><Icon name="car" size={40} /></span><span className="tg-brand">AVTO</span><h1>Avto kabinetingiz</h1><p>Avtomobillaringiz va xizmatlar tarixi — Telegram ichida.</p>{children}<Link className="tg-link" to="/yordam">Yordam</Link></section>;
}

function SessionStates() {
  const { status, session, retrySdk, retrySession } = useCabinet();
  if (status === 'loading') return <Welcome><Empty loading title="Ilova ochilmoqda…" /></Welcome>;
  if (status === 'error') return <Welcome><div className="tg-empty error" role="alert"><h2>Telegram bilan bog‘lanib bo‘lmadi</h2><p>Internet aloqasini tekshirib, qayta urinib ko‘ring.</p><PrimaryButton type="button" onClick={retrySdk}>Qayta urinish</PrimaryButton></div></Welcome>;
  if (status === 'outside') return <Welcome><div className="tg-empty"><h2>Telegram orqali oching</h2><p>Servis botidagi «Kabinetni ochish» tugmasidan foydalaning.</p>{configuredBotLink && <a className="tg-primary" href={configuredBotLink} rel="noopener noreferrer">Telegram botni ochish</a>}</div></Welcome>;
  if (session.state === 'error') return <Welcome><div className="tg-empty error" role="alert"><h2>Profilni ulab bo‘lmadi</h2><p>Aloqani tekshirib, yana urinib ko‘ring.</p><button type="button" className="tg-secondary" onClick={retrySession}>Qayta urinish</button></div></Welcome>;
  return <Welcome><Empty loading title="Profil tekshirilmoqda…">Telegram hisobingiz xavfsiz tekshirilmoqda.</Empty></Welcome>;
}

// Every account page passes through here: the server session decides the role,
// never the URL or Telegram's unsigned user data.
function Gate({ admin = false, chrome = true, nav = true, children }) {
  const { status, session, role, goBack } = useCabinet();
  const location = useLocation();
  if (status !== 'inside' || session.state !== 'ready') return <SessionStates />;
  if (role === 'user' && session.data.account === 'unlinked') return <Register />;
  if (admin && role !== 'admin') return <NotFound />;
  if (!chrome) return children;
  const menu = role === 'admin' ? adminMenu : userMenu;
  const active = '/' + location.pathname.split('/')[1];
  const person = role === 'admin' ? session.data.profile : session.data.customer || session.data.profile;
  return <div className={`tg-shell ${nav ? 'with-nav' : ''}`}><Header role={role} showBack={location.pathname !== '/'} onBack={goBack} initials={initials(person)} />{children}{nav && <BottomNav items={menu} active={active} />}</div>;
}

export function startTelegram() {
  // Telegram owns the URL hash for launch data. Keep application navigation in memory.
  const initialPath = window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '/';
  const router = createMemoryRouter([{ element: <TelegramLayout />, children: [
    { path: '/', element: <Gate><Home /></Gate> },
    { path: '/mijozlar', element: <Gate admin><Customers /></Gate> },
    { path: '/mijozlar/yangi', element: <Gate admin chrome={false}><CustomerCreate /></Gate> },
    { path: '/mashinalar', element: <Gate><Vehicles /></Gate> },
    { path: '/mashinalar/yangi', element: <Gate admin chrome={false}><VehicleCreate /></Gate> },
    { path: '/bolimlar', element: <Gate><Sections /></Gate> },
    { path: '/bolimlar/:serviceId', element: <Gate><ServiceDetail /></Gate> },
    { path: '/bolimlar/:serviceId/yangi', element: <Gate admin chrome={false}><RecordForm /></Gate> },
    { path: '/bolimlar/:serviceId/:recordId/tahrir', element: <Gate admin chrome={false}><RecordForm /></Gate> },
    { path: '/profil', element: <Gate nav={false}><Profile /></Gate> },
    { path: '/profil/tahrir', element: <Gate chrome={false}><ProfileEdit /></Gate> },
    { path: '/sozlamalar', element: <Gate><Settings /></Gate> },
    { path: '/yordam', element: <Help /> },
    { path: '*', element: <NotFound /> },
  ] }], { initialEntries: [initialPath] });
  createRoot(document.getElementById('root')).render(<React.StrictMode><RouterProvider router={router} /></React.StrictMode>);
}
