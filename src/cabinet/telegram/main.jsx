import React, { useContext, useEffect, useState, createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, Link, Outlet, RouterProvider, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { Button, StateCard } from '../Primitives';
import { botLink, loadTelegramSdk, mountTelegramViewport } from './sdk';
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
  return <TelegramContext.Provider value={{ status }}><div className="telegram-layout"><header className="app-header"><Link className="icon-button" to="/" aria-label="Bosh sahifa"><Icon name={childPage ? 'back' : 'car'} /></Link><strong className="telegram-brand">AVTO</strong><Link className="telegram-help" to="/yordam">Yordam</Link></header><main id="main-content" className="telegram-content">
    {status === 'loading' ? <StateCard kind="loading" title="Ilova ochilmoqda…" /> : status === 'error' ? <StateCard kind="error" title="Telegram bilan bog‘lanib bo‘lmadi" action={<Button onClick={() => setAttempt(value => value + 1)}>Qayta urinish</Button>}>Internet aloqasini tekshirib, qayta urinib ko‘ring.</StateCard> : <Outlet />}
  </main></div></TelegramContext.Provider>;
}

function Welcome() {
  const { status } = useContext(TelegramContext);
  return <section className="telegram-welcome"><span className="telegram-emblem"><Icon name="car" size={76} /></span><h1>Avto kabinetingiz</h1><p>Avtomobillaringiz va xizmatlar tarixi — Telegram ichida.</p>
    {status === 'outside' ? <StateCard title="Telegram orqali oching" action={configuredBotLink ? <a className="button-primary" href={configuredBotLink} rel="noopener noreferrer">Telegram botni ochish</a> : null}>Servis botidagi «Kabinetni ochish» tugmasidan foydalaning.</StateCard> : <StateCard title="Kabinet tayyorlanmoqda">Xizmat ishga tushgach, avtomobillaringiz va xizmatlar tarixini shu yerda ko‘rasiz.</StateCard>}
  </section>;
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
