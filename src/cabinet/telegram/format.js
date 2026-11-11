// Pure display helpers for the Telegram cabinet. No network, no DOM.

export const services = [
  { id: 'tires', name: 'Balonlar', icon: 'tire' },
  { id: 'engine_oil', name: 'Motor moyi', icon: 'oilcan' },
  { id: 'tint', name: 'Tonirovka', icon: 'window' },
  { id: 'antifreeze', name: 'Antifriz', icon: 'snow' },
];
export const serviceById = Object.fromEntries(services.map(service => [service.id, service]));

export const tireWheels = [
  { id: 'front_left', name: 'Old chap' },
  { id: 'front_right', name: 'Old o‘ng' },
  { id: 'rear_left', name: 'Orqa chap' },
  { id: 'rear_right', name: 'Orqa o‘ng' },
];

const monthsFull = ['YANVAR', 'FEVRAL', 'MART', 'APREL', 'MAY', 'IYUN', 'IYUL', 'AVGUST', 'SENTABR', 'OKTABR', 'NOYABR', 'DEKABR'];
const monthsShort = ['YAN', 'FEV', 'MAR', 'APR', 'MAY', 'IYN', 'IYL', 'AVG', 'SEN', 'OKT', 'NOY', 'DEK'];

function parts(value) {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? { year, month, day } : null;
}

const yearSuffix = (year, today) => (year === today.getFullYear() ? '' : ` ${year}`);

// "2026-05-01" -> "MAY 1" (the year is added only when it is not the current one).
export function formatMonthDay(value, today = new Date()) {
  const date = parts(value);
  return date ? `${monthsFull[date.month - 1]} ${date.day}${yearSuffix(date.year, today)}` : '';
}

// "2026-09-25" -> "25 SEN"
export function formatDayShort(value, today = new Date()) {
  const date = parts(value);
  return date ? `${date.day} ${monthsShort[date.month - 1]}${yearSuffix(date.year, today)}` : '';
}

// Performed and next date of one record: "MAY 1 - NOYABR 10".
export function formatRange(from, to, today = new Date()) {
  const start = formatMonthDay(from, today);
  const end = formatMonthDay(to, today);
  return start && end ? `${start} - ${end}` : start || end;
}

// "+998901234567" -> "+998 (90) 123-45-67". Unknown formats are returned unchanged.
export function formatPhone(value) {
  const digits = (value || '').replace(/\D/g, '');
  const local = /^998\d{9}$/.test(digits) ? digits.slice(3) : /^\d{9}$/.test(digits) ? digits : null;
  if (!local) return value || '';
  return `+998 (${local.slice(0, 2)}) ${local.slice(2, 5)}-${local.slice(5, 7)}-${local.slice(7)}`;
}

// Input mask used while typing a phone number.
export function maskPhoneInput(value) {
  let digits = (value || '').replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  if (!digits) return '';
  let out = '+998 (' + digits.slice(0, 2);
  if (digits.length >= 2) out += ')';
  if (digits.length > 2) out += ' ' + digits.slice(2, 5);
  if (digits.length > 5) out += '-' + digits.slice(5, 7);
  if (digits.length > 7) out += '-' + digits.slice(7, 9);
  return out;
}

// Uzbek plates start with a two-digit region code: "30UUU111" -> { region: "30", number: "UUU111" }.
export function splitPlate(value) {
  const plate = (value || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const match = /^(\d{2})([0-9A-Z]+)$/.exec(plate);
  return match ? { region: match[1], number: match[2] } : { region: '', number: plate };
}

export function fullName(person) {
  if (!person) return '';
  return [person.firstName ?? person.first_name, person.lastName ?? person.last_name].filter(Boolean).join(' ');
}

export function vehicleName(vehicle) {
  return (vehicle?.model || vehicle?.make || 'Mashina').toUpperCase();
}

const byLatest = (left, right) => (right.performed_on || '').localeCompare(left.performed_on || '') || (right.created_at || '').localeCompare(left.created_at || '');

export function recordsFor(records, serviceId) {
  return (Array.isArray(records) ? records : []).filter(record => record.service_type === serviceId).sort(byLatest);
}

// Next replacement date of a service: taken from the most recent record.
export function nextDueFor(records, serviceId) {
  return recordsFor(records, serviceId)[0]?.next_due_on || null;
}

// ---- Due-date status (used by every service row, pill and progress bar) ----

export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const dayNumber = value => { const date = parts(value); return date ? Date.UTC(date.year, date.month - 1, date.day) / 86400000 : null; };

// Whole days from today to the date (negative when the date has passed).
export function daysUntil(value, today = localToday()) {
  const target = dayNumber(value); const start = dayNumber(today);
  return target === null || start === null ? null : Math.round(target - start);
}

export const SOON_DAYS = 14;

// Status of one due date: ok (green), soon (amber), late (red) or none (no date).
export function dueStatus(nextDue, performed, today = localToday()) {
  const days = daysUntil(nextDue, today);
  if (days === null) return { kind: 'none', days: null, progress: 0, pill: '—', note: 'Sana belgilanmagan' };
  // Share of the interval already used: performed -> today out of performed -> next due.
  const total = daysUntil(nextDue, performed);
  const elapsed = daysUntil(today, performed);
  const progress = days < 0 ? 100 : total > 0 && elapsed !== null ? Math.max(4, Math.min(100, Math.round((elapsed / total) * 100))) : 50;
  const kind = days < 0 ? 'late' : days <= SOON_DAYS ? 'soon' : 'ok';
  const pill = days < 0 ? 'O‘TDI' : days === 0 ? 'Bugun' : `${days} kun`;
  const note = days < 0 ? `${-days} kun kechikdi` : days === 0 ? 'Bugun almashtiring' : `${days} kun qoldi`;
  return { kind, days, progress, pill, note };
}

const severity = { late: 3, soon: 2, ok: 1, none: 0 };

// Latest record per service of a vehicle, with its status, most urgent first.
export function serviceStatuses(records, today = localToday()) {
  return services.map(service => {
    const latest = recordsFor(records, service.id)[0] || null;
    return { service, latest, status: dueStatus(latest?.next_due_on, latest?.performed_on, today) };
  });
}

export function worstStatus(records, today = localToday()) {
  return serviceStatuses(records, today).reduce((worst, item) => (severity[item.status.kind] > severity[worst.status.kind] ? item : worst), { status: { kind: 'none' } });
}

export function latestOdometer(records) {
  return (Array.isArray(records) ? records : []).reduce((max, record) => (Number(record.odometer_km) > max ? Number(record.odometer_km) : max), 0) || null;
}

export function formatKm(value) {
  return value ? `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} km` : '';
}

export function initials(person) {
  const name = fullName(person).trim();
  if (!name) return '•';
  const words = name.split(/\s+/);
  return (words[0][0] + (words[1]?.[0] || '')).toLocaleUpperCase('uz');
}

// "2027-05-10" -> "10 MAY 2027" (year shown only when it is not the current one).
export function formatDayLong(value, today = new Date()) {
  const date = parts(value);
  return date ? `${date.day} ${monthsFull[date.month - 1]}${yearSuffix(date.year, today)}` : '';
}
