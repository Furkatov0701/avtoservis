import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Auth from './Auth';
import { Home, Clients, Cars, Services, ServiceDetail, Profile, NotFound } from './Pages';
import { PreviewContext, Modal } from './UI';
import { screenOptions } from './demo';

function PreviewLayout() {
  const [viewState, setViewState] = useState('sample');
  const [notice, setNotice] = useState(null);
  const [controlsOpen, setControlsOpen] = useState(() => window.matchMedia('(min-width: 801px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 801px)');
    const update = () => setControlsOpen(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setViewState('sample'); setNotice(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, search]);
  const auth = ['kirish', 'royxatdan-otish', 'taklif', 'mijoz-qoshish'].some(part => pathname.endsWith(part));
  const showNotice = (title, body) => setNotice({ title, body });
  return <PreviewContext.Provider value={{ viewState, setViewState, showNotice }}><a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>Asosiy mazmunga o‘tish</a><div className="preview-layout"><aside className="preview-panel"><div className="preview-brand">AVTO<span>UI / 02</span></div><p className="preview-intro">Dizaynni ko‘rish</p><p className="preview-description">Namuna ekranlari. Haqiqiy akkauntlar va ma’lumotlar bazasi hali ulanmagan.</p><details className="preview-controls" open={controlsOpen} onToggle={e => setControlsOpen(e.currentTarget.open)}><summary>Ekran va holatni tanlash</summary><label htmlFor="screen-preview">Ekran</label><select id="screen-preview" value={screenOptions.some(([path]) => path === pathname) ? pathname : ''} onChange={e => {
    const next = e.target.value;
    const car = new URLSearchParams(search).get('car');
    const query = car || next.includes('/xizmatlar/') ? `?car=${encodeURIComponent(car || 'sample-1')}` : '';
    navigate(`${next}${query}`);
  }}><option value="" disabled>Ekranni tanlang</option>{screenOptions.map(([path, title]) => <option key={path} value={path}>{title}</option>)}</select>{!auth && <><label htmlFor="state-preview">Ma’lumot holati</label><select id="state-preview" value={viewState} onChange={e => setViewState(e.target.value)}><option value="sample">Namuna ma’lumot</option><option value="empty">Bo‘sh holat</option><option value="loading">Yuklanish</option><option value="error">Xatolik</option><option value="denied">Ruxsat yo‘q</option></select></>}</details><div className="preview-palette" aria-hidden="true"><i /><i /><i /><i /><i /></div><p className="preview-footnote">OQ · BEJ · YASHIL</p></aside><div className="mobile-canvas"><Outlet key={pathname} /></div></div><Modal open={Boolean(notice)} onClose={() => setNotice(null)} title={notice?.title || ''}><p>{notice?.body}</p></Modal></PreviewContext.Provider>;
}

const router = createHashRouter([{ element: <PreviewLayout />, children: [
  { path: '/', element: <Navigate to="/kirish" replace /> },
  ...['/kirish', '/royxatdan-otish', '/admin/kirish', '/admin/taklif', '/admin/mijoz-qoshish'].map(path => ({ path, element: <Auth /> })),
  { path: '/admin/bosh-sahifa', element: <Home /> }, { path: '/admin/mijozlar', element: <Clients /> },
  ...['admin', 'user'].flatMap(role => [
    { path: `/${role}/mashinalar`, element: <Cars /> },
    { path: `/${role}/xizmatlar`, element: <Services /> },
    { path: `/${role}/xizmatlar/:serviceId`, element: <ServiceDetail /> },
    { path: `/${role}/profil`, element: <Profile /> },
  ]),
  { path: '*', element: <NotFound /> },
] }]);

export function startPreview() { createRoot(document.getElementById('root')).render(<React.StrictMode><RouterProvider router={router} /></React.StrictMode>); }
