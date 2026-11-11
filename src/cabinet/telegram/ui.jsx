import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDayShort, formatKm, latestOdometer, sentenceCase, splitPlate, titleCase, vehicleName } from './format';

// Outline icons drawn to match the green design (24px grid, round strokes).
const paths = {
  home: <path d="M4 10.5 12 4l8 6.5V20h-5v-5H9v5H4z" />,
  car: <><path d="M4.5 15.5V12l1.8-4.6A2 2 0 0 1 8.2 6h7.6a2 2 0 0 1 1.9 1.4l1.8 4.6v3.5" /><path d="M3.5 12h17v4.5h-17zM6 16.5v2.5m12-2.5v2.5" /><circle cx="7.5" cy="14.2" r=".6" /><circle cx="16.5" cy="14.2" r=".6" /></>,
  people: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.6-3.9 3.1-6 7-6s6.4 2.1 7 6" /></>,
  layers: <><path d="m12 4 8.5 4.5L12 13 3.5 8.5z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4m0 13.6v2.4m9.2-9.2h-2.4M5.2 12H2.8m15.7-6.5-1.7 1.7M7.2 16.8l-1.7 1.7m13 0-1.7-1.7M7.2 7.2 5.5 5.5" /><circle cx="12" cy="12" r="6.6" /></>,
  back: <path d="M19 12H5m6-6-6 6 6 6" />,
  avatar: <circle cx="12" cy="12" r="8" />,
  search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  down: <path d="m6 9 6 6 6-6" />,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4m7-4v4M8 13.5h2m4 0h2m-8 3h2m4 0h2" /></>,
  tire: <><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2.2" /><path d="M5.8 7.6c1.6 1 2.6 2.6 2.6 4.4s-1 3.4-2.6 4.4m12.4-8.8c-1.6 1-2.6 2.6-2.6 4.4s1 3.4 2.6 4.4" /></>,
  oilcan: <><path d="M3 9.5h3.5L8 8h5.5l2 2h1.8l3.7-2.2v1.6L15.8 15H6.5L3 12.5z" /><path d="M9 8V5.8h3V8m-9 1.5V7.5" /><path d="M20 15.5s-1.3 1.7-1.3 2.6a1.3 1.3 0 0 0 2.6 0c0-.9-1.3-2.6-1.3-2.6z" /></>,
  window: <><path d="M3.5 18.5 8.5 6h12v12.5z" /><path d="M13 6v12.5M3 18.5h18M6 15l3.5-7" /></>,
  snow: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5m-5 15L12 17l2.5 2.5M4 11l3.3 1L6 15m14-4-3.3 1L18 15M6 9l1.3 3M18 9l-1.3 3" />,
  phone: <path d="M6.5 4h3l1.5 4-2 1.3a10.5 10.5 0 0 0 5.7 5.7L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z" />,
  edit: <><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" /><path d="m14 8 3 3" /></>,
  logout: <path d="M10 4H5v16h5m1-8h9m-3.5-3.5L20 12l-3.5 3.5" />,
  contact: <><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  help: <><circle cx="12" cy="12" r="8.6" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.6m0 3v.1" /></>,
  clock: <><circle cx="12" cy="12" r="8.6" /><path d="M12 7.5V12l3 2" /></>,
  send: <><path d="m4 12 16-7-6 16-3-6z" /><path d="m11 15 9-10" /></>,
  right: <path d="m9 6 6 6-6 6" />,
};

export function Icon({ name, size = 22, className = '' }) {
  return <svg className={`tg-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.layers}</svg>;
}

export function Header({ role, showBack, onBack, initials }) {
  return <header className="tg-header"><div className="tg-header-bar">
    {showBack ? <button type="button" className="tg-back" onClick={onBack} aria-label="Orqaga qaytish"><Icon name="back" size={20} /></button> : <span className="tg-back-spacer" />}
    <strong className="tg-role">{role === 'admin' ? 'Admin' : 'User'}</strong>
    <Link className="tg-avatar" to="/profil" aria-label="Profil">{initials}</Link>
  </div></header>;
}

export function BottomNav({ items, active }) {
  return <nav className="tg-nav" aria-label="Asosiy menyu">{items.map(item => <Link key={item.to} to={item.to} className={active === item.to ? 'active' : ''} aria-label={item.label} aria-current={active === item.to ? 'page' : undefined}><Icon name={item.icon} size={20} /><span aria-hidden="true">{item.short}</span></Link>)}</nav>;
}

export function Pill({ kind = 'none', children }) {
  return <span className={`tg-pill ${kind}`}>{children}</span>;
}

// One service with its due status: icon, name, pill, progress bar, date and days left.
export function ServiceRow({ service, status, nextDue, to, onClick, label }) {
  const body = <><span className="tg-duo"><Icon name={service.icon} size={22} /></span><span className="tg-row-main"><span className="tg-row-top"><strong>{(label || service.name).toUpperCase()}</strong><Pill kind={status.kind}>{status.pill}</Pill></span><span className="tg-bar" aria-hidden="true"><i className={status.kind} style={{ width: `${status.progress}%` }} /></span><span className="tg-row-sub"><span>{nextDue ? formatDayShort(nextDue) : ''}</span><span>{status.note}</span></span></span></>;
  const aria = `${service.name}: ${status.note}`;
  if (to) return <Link className="tg-row tg-svc" to={to} aria-label={aria}>{body}</Link>;
  if (onClick) return <button type="button" className="tg-row tg-svc" onClick={onClick} aria-label={aria}>{body}</button>;
  return <div className="tg-row tg-svc" aria-label={aria}>{body}</div>;
}

// Dark vehicle card at the top of customer screens.
export function VehicleHero({ vehicle }) {
  const km = formatKm(latestOdometer(vehicle.service_records));
  const meta = [km, vehicle.production_year].filter(Boolean).join(' · ');
  return <div className="tg-hero"><span className="tg-hero-ic"><Icon name="car" size={26} /></span><span className="tg-hero-txt"><strong>{vehicleName(vehicle)}</strong>{meta && <small>{meta}</small>}<PlateBadge plate={vehicle.plate} /></span></div>;
}

export function PlateBadge({ plate }) {
  const { region, number } = splitPlate(plate);
  if (!number) return null;
  return <span className="tg-plate" aria-label={`Davlat raqami ${region} ${number}`}>{region && <b>{region}</b>}<span>{number}</span><i>UZ</i></span>;
}

export function SearchBar({ value, onChange, placeholder, label, action }) {
  return <div className="tg-search-row"><label className="tg-search"><Icon name="search" size={18} /><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={label || placeholder} /></label>{action}</div>;
}

export function AddButton({ to, label, onClick }) {
  return to ? <Link className="tg-add" to={to} aria-label={label}><Icon name="plus" size={24} /></Link> : <button type="button" className="tg-add" onClick={onClick} aria-label={label}><Icon name="plus" size={24} /></button>;
}

export function FormPage({ title, subtitle, children }) {
  return <section className="tg-form-page"><h1>{title}</h1>{subtitle && <p className="tg-subtitle">{subtitle}</p>}{children}</section>;
}

export function TextField({ label, name, required, hint, error, ...props }) {
  return <div className="tg-field"><label htmlFor={name}>{label}{required && ' *'}</label><input id={name} name={name} required={required} aria-invalid={error ? true : undefined} aria-describedby={error ? `${name}-error` : undefined} {...props} />{error && <p className="tg-field-error" id={`${name}-error`}>{error}</p>}{hint && !error && <p className="tg-field-hint">{hint}</p>}</div>;
}

export function PrimaryButton({ busy, children, ...props }) {
  return <button className="tg-primary" disabled={busy || props.disabled} aria-busy={busy || undefined} {...props}>{busy && <span className="tg-spinner" aria-hidden="true" />}{children}</button>;
}

export function Notice({ kind = 'info', children }) {
  const ref = useRef(null);
  useEffect(() => { if (kind === 'error') ref.current?.focus?.(); }, [kind, children]);
  return children ? <p ref={ref} tabIndex={-1} className={`tg-notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</p> : null;
}

export function Empty({ title, children, action, loading }) {
  return <div className="tg-empty" role="status">{loading ? <span className="tg-spinner big" aria-hidden="true" /> : null}<h2>{title}</h2>{children && <p>{children}</p>}{action}</div>;
}

export function Failure({ title, onRetry }) {
  return <div className="tg-empty error" role="alert"><h2>{title}</h2><p>Internet aloqasini tekshirib, qayta urinib ko‘ring.</p>{onRetry && <button type="button" className="tg-secondary" onClick={onRetry}>Qayta urinish</button>}</div>;
}

export function DateCard({ children, label }) {
  return <div className="tg-date-card"><Icon name="calendar" size={22} /><span>{label && <small>{label}</small>}<strong>{children}</strong></span></div>;
}

// Capitalises while typing without moving the caret (the text length never changes).
function recase(event, transform) {
  const input = event.target;
  const next = transform(input.value);
  if (next === input.value) return;
  const { selectionStart, selectionEnd } = input;
  input.value = next;
  try { input.setSelectionRange(selectionStart, selectionEnd); } catch { /* date/number inputs */ }
}
export const capitalizeWords = event => recase(event, titleCase);
export const capitalizeSentence = event => recase(event, sentenceCase);

// Text field with a suggestion list (combobox pattern): arrows, Enter and Escape work; tapping an option picks it.
export function Combobox({ label, name, required, value, onChange, suggestions, onPick, error, placeholder, hint }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const items = open ? suggestions : [];
  const pick = item => { onPick(item); setOpen(false); setActive(-1); };
  const onKeyDown = event => {
    if (!items.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => (i + 1) % items.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (event.key === 'Enter' && active >= 0) { event.preventDefault(); pick(items[active]); }
    else if (event.key === 'Escape') { setOpen(false); setActive(-1); }
  };
  return <div className="tg-field tg-combo">
    <label htmlFor={name}>{label}{required && ' *'}</label>
    <input id={name} name={name} value={value} placeholder={placeholder} autoComplete="off" autoCapitalize="words" role="combobox" aria-expanded={items.length > 0} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={active >= 0 && items[active] ? `${listId}-${active}` : undefined} aria-invalid={error ? true : undefined} aria-describedby={error ? `${name}-error` : undefined}
      onChange={event => { onChange(titleCase(event.target.value)); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKeyDown} />
    {items.length > 0 && <ul className="tg-options" id={listId} role="listbox" aria-label={`${label}: tavsiyalar`}>{items.map((item, index) => <li key={`${item.make}-${item.model}-${index}`} id={`${listId}-${index}`} role="option" aria-selected={index === active} className={index === active ? 'active' : ''} onMouseDown={event => { event.preventDefault(); pick(item); }}><strong>{item.label}</strong>{item.hint && <small>{item.hint}</small>}</li>)}</ul>}
    {error && <p className="tg-field-error" id={`${name}-error`}>{error}</p>}
    {hint && !error && <p className="tg-field-hint">{hint}</p>}
  </div>;
}

// Plate entry shaped like a real Uzbek plate: [30 | A123BC | UZ].
export function PlateInput({ region, body, onRegion, onBody, error }) {
  const bodyRef = useRef(null);
  return <div className="tg-field">
    <span className="tg-label" id="plate-label">Davlat raqami *</span>
    <div className={`tg-plate-input ${error ? 'invalid' : ''}`} role="group" aria-labelledby="plate-label">
      <input aria-label="Hudud kodi (2 raqam)" inputMode="numeric" placeholder="30" value={region} aria-invalid={error ? true : undefined}
        onChange={event => { const next = event.target.value.replace(/\D/g, '').slice(0, 2); onRegion(next); if (next.length === 2) bodyRef.current?.focus(); }} />
      <input ref={bodyRef} aria-label="Raqam (6 belgi)" placeholder="A123BC" autoCapitalize="characters" autoComplete="off" value={body} aria-invalid={error ? true : undefined} aria-describedby={error ? 'plate-error' : 'plate-hint'}
        onChange={event => onBody(event.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6))} />
      <span className="tg-plate-uz" aria-hidden="true"><i /><b>UZ</b></span>
    </div>
    {error ? <p className="tg-field-error" id="plate-error">{error}</p> : <p className="tg-field-hint" id="plate-hint">Masalan: 30 | A123BC yoki 01 | 123ABC</p>}
  </div>;
}
