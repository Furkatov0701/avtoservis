import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './ui';
import { daysUntil, localToday } from './format';

// Drum-style date picker (Kun · Oy · Yil) shown in a bottom sheet, as chosen for the design.
const MONTHS = ['YANVAR', 'FEVRAL', 'MART', 'APREL', 'MAY', 'IYUN', 'IYUL', 'AVGUST', 'SENTABR', 'OKTABR', 'NOYABR', 'DEKABR'];
const ITEM = 40;

const pad = number => String(number).padStart(2, '0');
const toIso = ({ y, m, d }) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

function parse(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) } : null;
}

// "2026-11-11" + 6 months -> "2027-05-11"; the day is clamped at month ends (31 Aug + 6 -> 28/29 Feb).
export function addMonths(value, months) {
  const date = parse(value) || parse(localToday());
  const total = date.y * 12 + (date.m - 1) + months;
  const y = Math.floor(total / 12); const m = (total % 12) + 1;
  return toIso({ y, m, d: Math.min(date.d, daysInMonth(y, m)) });
}

export function addDays(value, days) {
  const date = parse(value) || parse(localToday());
  const next = new Date(date.y, date.m - 1, date.d + days);
  return toIso({ y: next.getFullYear(), m: next.getMonth() + 1, d: next.getDate() });
}

// "2027-05-11" -> "11 MAY 2027" (always with the year inside form fields).
export function formatFieldDate(value) {
  const date = parse(value);
  return date ? `${date.d} ${MONTHS[date.m - 1]} ${date.y}` : '';
}

function relative(value) {
  const days = daysUntil(value);
  if (days === null) return '';
  if (days === 0) return 'bugun';
  return days > 0 ? `${days} kundan keyin` : `${-days} kun oldin`;
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function WheelColumn({ label, items, index, onIndex }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const id = useId();
  useEffect(() => {
    const element = ref.current;
    if (element && Math.round(element.scrollTop / ITEM) !== index) element.scrollTo({ top: index * ITEM, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [index, items.length]);
  useEffect(() => () => clearTimeout(timer.current), []);
  // When the finger lets go, the column snaps; the centred item becomes the value.
  const onScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const element = ref.current;
      if (!element) return;
      const next = Math.max(0, Math.min(items.length - 1, Math.round(element.scrollTop / ITEM)));
      if (next !== index) onIndex(next);
    }, 90);
  };
  const onKeyDown = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); onIndex(Math.min(items.length - 1, index + 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); onIndex(Math.max(0, index - 1)); }
  };
  return <div className="tg-wcol" ref={ref} role="listbox" aria-label={label} tabIndex={0} aria-activedescendant={`${id}-${index}`} onScroll={onScroll} onKeyDown={onKeyDown}>
    <div className="tg-wpad" aria-hidden="true" />
    {items.map((item, i) => <div key={item} id={`${id}-${i}`} role="option" aria-selected={i === index} className={i === index ? 'c' : ''} onClick={() => onIndex(i)}>{item}</div>)}
    <div className="tg-wpad" aria-hidden="true" />
  </div>;
}

function Sheet({ title, value, start, quick, clearable, onPick, onClose }) {
  const initial = parse(value) || parse(start) || parse(localToday());
  const [date, setDate] = useState(initial);
  const titleId = useId();
  const sheetRef = useRef(null);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => thisYear - 10 + i);
  if (!years.includes(date.y)) { years.push(date.y); years.sort((a, b) => a - b); }
  const maxDay = daysInMonth(date.y, date.m);
  const days = Array.from({ length: maxDay }, (_, i) => String(i + 1));
  const set = patch => setDate(current => {
    const next = { ...current, ...patch };
    return { ...next, d: Math.min(next.d, daysInMonth(next.y, next.m)) };
  });
  useEffect(() => {
    sheetRef.current?.querySelector('[role="listbox"]')?.focus();
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const iso = toIso(date);
  return <div className="tg-sheet-wrap">
    <div className="tg-sheet-dim" onClick={onClose} aria-hidden="true" />
    <div className="tg-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={sheetRef}>
      <div className="tg-grab" aria-hidden="true" />
      <div className="tg-sheet-title"><strong id={titleId}>{title}</strong>{clearable && <button type="button" className="tg-sheet-clear" onClick={() => onPick('')}>Tozalash</button>}</div>
      {quick.length > 0 && <div className="tg-chips">{quick.map(chip => <button type="button" key={chip.label} className={`tg-qchip ${chip.value === iso ? 'on' : ''}`} onClick={() => setDate(parse(chip.value))}>{chip.label}</button>)}</div>}
      <div className="tg-wlabels" aria-hidden="true"><span>KUN</span><span>OY</span><span>YIL</span></div>
      <div className="tg-wheels-picker">
        <WheelColumn label="Kun" items={days} index={date.d - 1} onIndex={i => set({ d: i + 1 })} />
        <WheelColumn label="Oy" items={MONTHS} index={date.m - 1} onIndex={i => set({ m: i + 1 })} />
        <WheelColumn label="Yil" items={years.map(String)} index={years.indexOf(date.y)} onIndex={i => set({ y: years[i] })} />
      </div>
      <p className="tg-sheet-result" role="status">{formatFieldDate(iso)} · {relative(iso)}</p>
      <button type="button" className="tg-primary" onClick={() => onPick(iso)}>Tanlash</button>
    </div>
  </div>;
}

// Form field: shows the date in words; the value is submitted through a hidden input.
export function DateField({ label, name, defaultValue = '', required, error, start, quick = [], sheetTitle, autoOpen = false, onChange }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(autoOpen);
  const buttonRef = useRef(null);
  const labelId = useId();
  const close = () => { setOpen(false); buttonRef.current?.focus(); };
  const pick = next => { setValue(next); onChange?.(next); close(); };
  return <div className="tg-field">
    <span className="tg-label" id={labelId} aria-hidden="true">{label}{required && ' *'}</span>
    <button type="button" ref={buttonRef} className={`tg-date ${value ? '' : 'empty'} ${open ? 'on' : ''}`} aria-describedby={error ? `${name}-error` : undefined} aria-invalid={error ? true : undefined} aria-haspopup="dialog" aria-label={`${label}: ${value ? formatFieldDate(value) : 'tanlanmagan'}`} onClick={() => setOpen(true)}>
      <Icon name="calendar" size={18} /><span>{value ? formatFieldDate(value) : 'Sanani tanlang'}</span>
    </button>
    <input type="hidden" name={name} value={value} />
    {error && <p className="tg-field-error" id={`${name}-error`}>{error}</p>}
    {open && <Sheet title={sheetTitle || label} value={value} start={start} quick={quick} clearable={!required && Boolean(value)} onPick={pick} onClose={close} />}
  </div>;
}
