import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, Link, NavLink, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { Button, StateCard } from '../Primitives';
import { Icon } from '../Icon';
import { AuthProvider, useAuth } from './AuthProvider';
import { authConfig } from './client';
import { authError } from './errors';
import { canAccess } from './session';
import AccountForm from './AccountForm';

function SignOutButton() {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div><Button secondary className="w-full" busy={busy} onClick={async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { await signOut(); } catch (failure) { setError(authError(failure)); } finally { setBusy(false); }
  }}><Icon name="logout" size={22} /> Chiqish</Button>{error && <p role="alert" className="field-error">{error}</p>}</div>;
}

function Guard({ role }) {
  const identity = useAuth();
  if (identity.status === 'loading') return <div className="app-surface no-nav"><StateCard kind="loading" title="Kabinet yuklanmoqda…" /></div>;
  if (identity.status === 'signedOut') return <Navigate to="/kirish" replace />;
  if (identity.status === 'error') return <div className="app-surface no-nav"><StateCard kind="error" title="Kabinetni yuklab bo‘lmadi" action={<Button onClick={identity.reload}>Qayta urinish</Button>}>{identity.error}</StateCard><SignOutButton /></div>;
  if (identity.status === 'unverified') return <div className="app-surface no-nav"><StateCard kind="denied" title="Telefon tasdiqlanmagan">Telefon raqamingizni tasdiqlab, qayta kiring.</StateCard><SignOutButton /></div>;
  if (role && !canAccess(identity, role)) return <div className="app-surface no-nav"><StateCard kind="denied" title="Ruxsat yo‘q" action={<Link className="button-primary" to={`/${identity.profile.role}/${identity.profile.role === 'admin' ? 'bosh-sahifa' : 'mashinalar'}`}>O‘z kabinetimga qaytish</Link>}>Bu sahifa uchun vakolatingiz yo‘q.</StateCard></div>;
  return <Outlet />;
}

function LiveWorkspace({ section }) {
  const { profile, user } = useAuth();
  const role = profile.role;
  const profilePage = section === 'profil';
  const nav = role === 'admin' ? [['bosh-sahifa', 'Bosh sahifa', 'home'], ['mijozlar', 'Mijozlar', 'people'], ['mashinalar', 'Mashinalar', 'car'], ['xizmatlar', 'Bo‘limlar', 'layers'], ['profil', 'Profil', 'settings']] : [['mashinalar', 'Mashinalar', 'car'], ['xizmatlar', 'Xizmatlar', 'layers'], ['profil', 'Profil', 'user']];
  const title = nav.find(item => item[0] === section)?.[1] || 'Kabinet';
  return <div className={`app-surface ${profilePage ? 'no-nav' : ''}`}><header className="app-header"><Link className="icon-button back-button" to={`/${role}/${role === 'admin' ? 'bosh-sahifa' : 'mashinalar'}`} aria-label="Bosh sahifaga"><Icon name="back" /></Link><div className="header-title"><strong>{role === 'admin' ? 'Admin' : 'User'}</strong></div><Link className="icon-button profile-button" to={`/${role}/profil`} aria-label="Profilni ochish"><Icon name="user" size={29} /></Link></header><main className="page-content" id="main-content"><h1 className="sr-only">{title}</h1>{profilePage ? <article className="profile-card"><h2>{`${profile.first_name} ${profile.last_name}`.trim() || 'Mening profilim'}</h2><div className="profile-row"><Icon name="phone" size={23} /><span>+{user.phone.replace(/^\+/, '')}</span></div><Link className="profile-action" to="/parol"><Icon name="lock" size={22} /> PAROLNI ALMASHTIRISH</Link><SignOutButton /></article> : <StateCard title={title}>Kirish va akkaunt roli tekshirildi. Ushbu bo‘limning haqiqiy ma’lumotlar oqimi keyingi bosqichda ulanadi.</StateCard>}</main>{!profilePage && <nav className="bottom-nav" aria-label="Asosiy menyu" style={{ '--item-count': nav.length }}>{nav.map(([route, label, icon]) => <NavLink key={route} to={`/${role}/${route}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-icon"><Icon name={icon} size={25} /></span><span className="nav-label">{label}</span></NavLink>)}</nav>}</div>;
}

function LiveLayout() {
  const location = useLocation();
  return <div className="live-layout"><Outlet key={location.pathname} /></div>;
}

function PublicForm({ flow }) {
  const identity = useAuth();
  if (flow === 'login' && identity.status === 'error') return <div className="app-surface no-nav"><StateCard kind="error" title="Profilni tekshirib bo‘lmadi" action={<Button onClick={identity.reload}>Qayta urinish</Button>}>{identity.error}</StateCard><SignOutButton /></div>;
  if (flow === 'login' && identity.status === 'unverified') return <div className="app-surface no-nav"><StateCard kind="denied" title="Telefon tasdiqlanmagan">Telefoningizni tasdiqlash uchun ro‘yxatdan o‘tishda kelgan SMS koddan foydalaning.</StateCard><SignOutButton /></div>;
  return <AccountForm flow={flow} />;
}

export function startLive() {
  const root = createRoot(document.getElementById('root'));
  if (authConfig.error) {
    root.render(<div className="live-layout"><div className="app-surface no-nav"><StateCard kind="error" title="Kirish vaqtincha mavjud emas">Xizmat sozlanmoqda. Iltimos, keyinroq qayta urinib ko‘ring.</StateCard></div></div>);
    return;
  }
  const router = createHashRouter([{ element: <AuthProvider><LiveLayout /></AuthProvider>, children: [
    { path: '/', element: <Navigate to="/kirish" replace /> },
    ...['/kirish', '/admin/kirish'].map(path => ({ path, element: <PublicForm flow="login" /> })),
    { path: '/royxatdan-otish', element: <PublicForm flow="signup" /> },
    { path: '/parolni-tiklash', element: <PublicForm flow="recovery" /> },
    { element: <Guard />, children: [{ path: '/parol', element: <AccountForm flow="password" /> }] },
    ...['user', 'admin'].map(role => ({ element: <Guard role={role} />, children: (role === 'admin' ? ['bosh-sahifa', 'mijozlar', 'mashinalar', 'xizmatlar', 'profil'] : ['mashinalar', 'xizmatlar', 'profil']).map(section => ({ path: `/${role}/${section}`, element: <LiveWorkspace section={section} /> })) })),
    { path: '*', element: <div className="app-surface no-nav"><StateCard title="Sahifa topilmadi" action={<Link className="button-primary" to="/kirish">Kirishga qaytish</Link>} /></div> },
  ] }]);
  root.render(<React.StrictMode><RouterProvider router={router} /></React.StrictMode>);
}
