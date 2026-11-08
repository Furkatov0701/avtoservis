import { Button, StateCard } from './Primitives';
export { Modal, Button, Field, StateCard, ScreenHeading } from './Primitives';
import { createContext, useContext, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from './Icon';
import { demoCars } from './demo';

export const PreviewContext = createContext(null);
export const usePreview = () => useContext(PreviewContext);

export function useCabinet() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const role = pathname.startsWith('/admin') ? 'admin' : 'user';
  const cars = demoCars.filter(car => role === 'admin' || car.owner === 'sample-user');
  const car = cars.find(item => item.id === params.get('car'));
  const query = car ? `?car=${encodeURIComponent(car.id)}` : '';
  return { role, cars, car, query, path: (section) => `/${role}/${section}${query}` };
}




export function Header({ backTo, hideBack = false }) {
  const { role, car, path } = useCabinet();
  return <header className="app-header">{hideBack ? <span className="header-spacer" /> : <Link className="icon-button back-button" to={backTo || path('mashinalar')} aria-label="Orqaga"><Icon name="back" /></Link>}<div className="header-title"><strong>{role === 'admin' ? 'Admin' : 'User'}</strong></div><Link className="icon-button profile-button" to={path('profil')} aria-label="Profilni ochish"><Icon name="user" size={29} /></Link></header>;
}

export function BottomNav() {
  const { role, path } = useCabinet();
  const items = role === 'admin' ? [['bosh-sahifa', 'Bosh sahifa', 'home'], ['mijozlar', 'Mijozlar', 'people'], ['mashinalar', 'Mashinalar', 'car'], ['xizmatlar', 'Bo‘limlar', 'layers'], ['profil', 'Profil', 'settings']] : [['mashinalar', 'Mashinalar', 'car'], ['xizmatlar', 'Xizmatlar', 'layers'], ['profil', 'Profil', 'user']];
  return <nav className="bottom-nav" aria-label={`${role === 'admin' ? 'Admin' : 'User'} asosiy menyusi`} style={{ '--item-count': items.length }}>{items.map(([route, label, icon]) => <NavLink key={route} to={path(route)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-icon"><Icon name={icon} size={25} /></span><span className="nav-label">{label}</span></NavLink>)}</nav>;
}

export function Shell({ children, backTo, hideBack = false, noNav = false, title }) {
  useEffect(() => { document.title = `${title || 'Kabinet'} — Avto`; }, [title]);
  return <div className={`app-surface ${noNav ? 'no-nav' : ''}`}><Header backTo={backTo} hideBack={hideBack} /><main id="main-content" tabIndex={-1} className="page-content">{children}</main>{!noNav && <BottomNav />}</div>;
}

export function Search({ value, onChange, placeholder, label }) {
  return <div className="search-field"><Icon name="search" size={23} /><input type="search" value={value} onChange={e => onChange(e.target.value)} aria-label={label || placeholder} placeholder={placeholder} /></div>;
}


export function DataState({ children, emptyTitle = 'Hozircha ma’lumot yo‘q' }) {
  const { viewState, setViewState } = usePreview();
  if (viewState === 'loading') return <StateCard kind="loading" title="Yuklanmoqda…">Ma’lumot yuklanishining namuna holati.</StateCard>;
  if (viewState === 'empty') return <StateCard title={emptyTitle}>Ma’lumot qo‘shilgach, shu yerda ko‘rinadi.</StateCard>;
  if (viewState === 'error') return <StateCard kind="error" title="Ma’lumotni yuklab bo‘lmadi" action={<Button secondary onClick={() => setViewState('sample')}><Icon name="refresh" size={20} /> Qayta urinish</Button>}>Internet aloqasini tekshirib, qayta urinib ko‘ring.</StateCard>;
  if (viewState === 'denied') return <StateCard kind="denied" title="Ruxsat yo‘q">Bu ma’lumotni ko‘rish uchun ruxsat kerak.</StateCard>;
  return children;
}

export function VehicleContext() {
  const { car, path } = useCabinet();
  if (!car) return null;
  return <Link className="vehicle-context" to={path('mashinalar')} aria-label="Tanlangan avtomobilni almashtirish"><Icon name="car" size={23} /><span>{car.model}<strong>{car.plate}</strong></span><span className="change-label">Almashtirish</span></Link>;
}

export function ChooseVehicle() {
  const { path } = useCabinet();
  return <StateCard title="Avval avtomobilni tanlang" action={<Link className="button-primary" to={path('mashinalar')}>Mashinalarni ochish</Link>}>Xizmatlar tanlangan avtomobilga tegishli bo‘ladi.</StateCard>;
}
