import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TireArt } from '../Icon';
import { useCabinet } from './context';
import { Empty, Failure, Icon, Pill, PlateBadge, SearchBar, ServiceRow, VehicleHero } from './ui';
import { dueStatus, formatDayLong, formatDayShort, formatKm, formatPhone, formatRange, fullName, initials, recordsFor, serviceById, services, serviceStatuses, tireWheels, vehicleName, worstStatus } from './format';

const normalize = value => (value || '').toLocaleLowerCase('uz').replace(/\s+/g, '');

// Records of one vehicle: customers receive them with their vehicles, admins load them per vehicle.
function useVehicleRecords(vehicle) {
  const { role, recordCache, loadRecords } = useCabinet();
  const cached = vehicle ? recordCache[vehicle.id] : null;
  useEffect(() => { if (role === 'admin' && vehicle && !cached) loadRecords(vehicle.id); }, [role, vehicle, cached, loadRecords]);
  if (!vehicle) return { kind: 'idle', list: [] };
  if (role === 'user') return { kind: 'ready', list: vehicle.service_records || [] };
  return cached || { kind: 'loading', list: vehicle.service_records || [] };
}

function useVehiclesLoaded() {
  const { role, userVehicles, loadUserVehicles, adminVehicles, loadAdminVehicles, selectedCustomer } = useCabinet();
  const key = selectedCustomer?.id || 'all';
  useEffect(() => {
    if (role === 'user' && userVehicles.kind === 'idle') loadUserVehicles().catch(() => {});
    if (role === 'admin' && (adminVehicles.key !== key || adminVehicles.kind === 'idle')) loadAdminVehicles();
  }, [role, userVehicles.kind, loadUserVehicles, adminVehicles.key, adminVehicles.kind, key, loadAdminVehicles]);
  if (role === 'user') return { kind: userVehicles.kind === 'idle' ? 'loading' : userVehicles.kind, retry: () => loadUserVehicles().catch(() => {}) };
  return { kind: adminVehicles.key !== key || adminVehicles.kind === 'idle' ? 'loading' : adminVehicles.kind, retry: loadAdminVehicles };
}

function VehicleContext({ vehicle }) {
  return <div className="tg-context"><Icon name="car" size={17} /><span>{vehicleName(vehicle)}</span><PlateBadge plate={vehicle.plate} /><Link to="/mashinalar">O‘zgartirish</Link></div>;
}

function ChooseVehicle() {
  const loaded = useVehiclesLoaded();
  const { vehicles } = useCabinet();
  if (loaded.kind === 'loading') return <Empty loading title="Mashinalar yuklanmoqda…" />;
  if (loaded.kind === 'error') return <Failure title="Mashinalarni yuklab bo‘lmadi" onRetry={loaded.retry} />;
  if (!vehicles.length) return <Empty title="Hali mashina yo‘q">Servis administratori mashinangizni qo‘shgach, xizmatlar shu yerda ko‘rinadi.</Empty>;
  return <Empty title="Avval mashinani tanlang" action={<Link className="tg-secondary" to="/mashinalar">Mashinalarni ochish</Link>}>Xizmatlar tanlangan mashina bo‘yicha ko‘rsatiladi.</Empty>;
}

function OverdueAlert({ statuses }) {
  const late = statuses.filter(item => item.status.kind === 'late');
  if (!late.length) return null;
  const text = late.length === 1 ? `${late[0].service.name} muddati ${-late[0].status.days} kun oldin o‘tgan` : `${late.length} ta xizmat muddati o‘tgan`;
  return <p className="tg-alert" role="alert"><i aria-hidden="true" />{text}</p>;
}

export function Home() {
  const { role } = useCabinet();
  return role === 'admin' ? <AdminHome /> : <CustomerHome />;
}

function AdminHome() {
  const { overview, loadOverview, selectCustomer, selectVehicle } = useCabinet();
  const navigate = useNavigate();
  useEffect(() => { if (overview.kind === 'idle') loadOverview().catch(() => {}); }, [overview.kind, loadOverview]);
  const data = overview.data;
  const open = item => {
    if (item.customer) selectCustomer({ ...item.customer, linked: true });
    if (item.vehicle) selectVehicle(item.vehicle.id);
    navigate(`/bolimlar/${item.serviceType}`);
  };
  return <section className="tg-page"><h1 className="sr-only">Bosh sahifa</h1>
    <div className="tg-promo"><div><p>15 % — AKSIYA</p><h2>BALONLAR</h2></div><TireArt /></div>
    {overview.kind === 'error' && !data ? <Failure title="Statistikani yuklab bo‘lmadi" onRetry={() => loadOverview().catch(() => {})} /> : !data ? <Empty loading title="Statistika yuklanmoqda…" /> : <>
      <div className="tg-stats"><div><strong>{data.stats.customers}</strong><small>MIJOZ</small></div><div className="soon"><strong>{data.stats.thisWeek}</strong><small>BU HAFTA</small></div><div className="late"><strong>{data.stats.overdue}</strong><small>O‘TGAN</small></div></div>
      <h2 className="tg-section">Qo‘ng‘iroq qilish kerak</h2>
      {!data.due.length ? <p className="tg-muted-note">Hozircha muddati kelgan xizmat yo‘q.</p> : <div className="tg-rows">{data.due.slice(0, 5).map(item => {
        const status = dueStatus(item.nextDueOn, null);
        return <button type="button" className="tg-row tg-call" key={item.id} onClick={() => open(item)}><span className="tg-mini-ava">{initials(item.customer)}</span><span className="tg-row-text"><strong>{fullName(item.customer) || 'Mijoz'}</strong><small>{serviceById[item.serviceType]?.name} · {item.vehicle ? item.vehicle.model : ''}</small></span><Pill kind={status.kind}>{item.days < 0 ? `${-item.days} kun o‘tdi` : status.pill}</Pill></button>;
      })}{data.due.length > 5 && <p className="tg-muted-note">Yana {data.due.length - 5} ta mijoz</p>}</div>}
    </>}
  </section>;
}

function CustomerHome() {
  const loaded = useVehiclesLoaded();
  const { vehicles, selectedVehicle, selectVehicle } = useCabinet();
  const vehicle = selectedVehicle || vehicles[0];
  if (loaded.kind === 'loading' && !vehicles.length) return <section className="tg-page"><Empty loading title="Ma’lumotlar yuklanmoqda…" /></section>;
  if (loaded.kind === 'error' && !vehicles.length) return <section className="tg-page"><Failure title="Ma’lumotlarni yuklab bo‘lmadi" onRetry={loaded.retry} /></section>;
  if (!vehicle) return <section className="tg-page"><h1 className="sr-only">Bosh sahifa</h1><Empty title="Hali mashina yo‘q">Servis administratori mashinangizni qo‘shgach, xizmat sanalari shu yerda ko‘rinadi.</Empty></section>;
  const statuses = serviceStatuses(vehicle.service_records);
  const upcoming = statuses.filter(item => item.status.kind !== 'none').sort((a, b) => a.status.days - b.status.days).slice(0, 2);
  return <section className="tg-page"><h1 className="sr-only">Bosh sahifa</h1>
    <VehicleHero vehicle={vehicle} />
    <OverdueAlert statuses={statuses} />
    <div className="tg-section"><h2>Yaqin xizmatlar</h2><Link to="/bolimlar" onClick={() => selectVehicle(vehicle.id)}>Barchasi ›</Link></div>
    {!upcoming.length ? <Empty title="Rejalashtirilgan xizmat yo‘q">Keyingi xizmat sanalari shu yerda ko‘rinadi.</Empty> : <div className="tg-rows">{upcoming.map(({ service, latest, status }) => <ServiceRow key={service.id} service={service} status={status} nextDue={latest?.next_due_on} to={`/bolimlar/${service.id}`} />)}</div>}
  </section>;
}

function vehiclePill(records) {
  const statuses = serviceStatuses(records);
  const late = statuses.filter(item => item.status.kind === 'late').length;
  const worst = worstStatus(records);
  if (late) return <Pill kind="late">{late} ta o‘tgan</Pill>;
  if (worst.status.kind === 'soon') return <Pill kind="soon">{worst.status.pill}</Pill>;
  if (worst.status.kind === 'ok') return <Pill kind="ok">Hammasi joyida</Pill>;
  return <Pill kind="none">Yozuv yo‘q</Pill>;
}

export function Vehicles() {
  const { role, vehicles, selectVehicle, selectedCustomer, selectCustomer } = useCabinet();
  const loaded = useVehiclesLoaded();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const filtered = vehicles.filter(vehicle => normalize(`${vehicle.make} ${vehicle.model} ${vehicle.plate} ${fullName(vehicle.customers)}`).includes(normalize(query)));
  const add = role !== 'admin' ? null : selectedCustomer ? <Link className="tg-add" to="/mashinalar/yangi" aria-label="Mashina qo‘shish"><Icon name="plus" size={22} /></Link> : <button type="button" className="tg-add" aria-label="Mashina qo‘shish" onClick={() => navigate('/mijozlar', { state: { notice: 'Mashina qo‘shish uchun mijozni tanlang va «Ko‘rish»ni bosing.' } })}><Icon name="plus" size={22} /></button>;
  return <section className="tg-page"><h1 className="sr-only">Mashinalar</h1>
    <SearchBar value={query} onChange={setQuery} placeholder="Mashina qidirish ....." label="Mashina qidirish" action={add} />
    {role === 'admin' && selectedCustomer && <div className="tg-context"><Icon name="people" size={17} /><span>{fullName(selectedCustomer)}</span><button type="button" onClick={() => selectCustomer(null)}>Barcha mashinalar</button></div>}
    {loaded.kind === 'loading' && !vehicles.length ? <Empty loading title="Mashinalar yuklanmoqda…" /> : loaded.kind === 'error' ? <Failure title="Mashinalarni yuklab bo‘lmadi" onRetry={loaded.retry} /> : !vehicles.length ? <Empty title="Hali mashina yo‘q">{role === 'admin' ? '«+» tugmasi orqali mashina qo‘shing.' : 'Servis administratori mashinangizni qo‘shgach, u shu yerda ko‘rinadi.'}</Empty> : !filtered.length ? <Empty title="Mashina topilmadi" /> : <div className="tg-grid">{filtered.map(vehicle => <button type="button" className="tg-tile" key={vehicle.id} onClick={() => { selectVehicle(vehicle.id); navigate('/bolimlar'); }}><span className="tg-duo big"><Icon name="car" size={26} /></span><strong>{vehicleName(vehicle)}</strong><PlateBadge plate={vehicle.plate} />{role === 'admin' && !selectedCustomer && vehicle.customers && <small>{fullName(vehicle.customers)}</small>}{vehiclePill(vehicle.service_records)}</button>)}</div>}
  </section>;
}

export function Sections() {
  const { role, selectedVehicle, loadRecords } = useCabinet();
  const records = useVehicleRecords(selectedVehicle);
  const [query, setQuery] = useState('');
  if (!selectedVehicle) return <section className="tg-page"><h1 className="sr-only">Bo‘limlar</h1><ChooseVehicle /></section>;
  const statuses = serviceStatuses(records.list).filter(item => normalize(item.service.name).includes(normalize(query)));
  return <section className="tg-page"><h1 className="sr-only">Bo‘limlar</h1>
    {role === 'admin' ? <><SearchBar value={query} onChange={setQuery} placeholder="Bo‘lim qidirish ....." label="Bo‘lim qidirish" /><VehicleContext vehicle={selectedVehicle} /></> : <VehicleHero vehicle={selectedVehicle} />}
    {records.kind === 'error' ? <Failure title="Xizmatlarni yuklab bo‘lmadi" onRetry={() => loadRecords(selectedVehicle.id)} /> : !statuses.length ? <Empty title="Bo‘lim topilmadi" /> : <div className="tg-rows">{statuses.map(({ service, latest, status }) => <ServiceRow key={service.id} service={service} status={status} nextDue={latest?.next_due_on} to={`/bolimlar/${service.id}`} />)}</div>}
  </section>;
}

export function ServiceDetail() {
  const { serviceId } = useParams();
  const { role, selectedVehicle, loadRecords } = useCabinet();
  const records = useVehicleRecords(selectedVehicle);
  const navigate = useNavigate();
  const service = serviceById[serviceId];
  if (!service) return <NotFound inline />;
  if (!selectedVehicle) return <section className="tg-page"><h1 className="sr-only">{service.name}</h1><ChooseVehicle /></section>;
  const list = recordsFor(records.list, service.id);
  const latest = list[0];
  const wheels = service.id === 'tires' && latest?.tire_positions && typeof latest.tire_positions === 'object' ? latest.tire_positions : null;
  const status = dueStatus(latest?.next_due_on, latest?.performed_on);
  return <section className="tg-page"><h1 className="sr-only">{service.name}</h1>
    <label className="tg-select"><span className="sr-only">Xizmat turini tanlang</span><select value={service.id} onChange={event => navigate(`/bolimlar/${event.target.value}`, { replace: true })}>{services.map(item => <option key={item.id} value={item.id}>{item.name.toUpperCase()}</option>)}</select><Icon name="down" size={20} /></label>
    <VehicleContext vehicle={selectedVehicle} />
    {records.kind === 'loading' && !list.length ? <Empty loading title="Xizmatlar yuklanmoqda…" /> : records.kind === 'error' ? <Failure title="Xizmatlarni yuklab bo‘lmadi" onRetry={() => loadRecords(selectedVehicle.id)} /> : !list.length ? <Empty title="Hali yozuv yo‘q">{role === 'admin' ? 'Pastdagi tugma orqali birinchi yozuvni qo‘shing.' : 'Servisda xizmat ko‘rsatilgach, sanalar shu yerda ko‘rinadi.'}</Empty>
      : wheels ? <>
        <div className="tg-car" aria-label="Balonlarning keyingi almashtirish sanalari"><span className="tg-car-body" aria-hidden="true" />
          {tireWheels.map(wheel => { const wheelStatus = dueStatus(wheels[wheel.id], latest.performed_on); return <span key={wheel.id} className={`tg-tyre ${wheel.id} ${wheelStatus.kind}`} aria-hidden="true" />; })}
          {tireWheels.map(wheel => { const wheelStatus = dueStatus(wheels[wheel.id], latest.performed_on); return <div key={wheel.id} className={`tg-wheel ${wheel.id}`}><small>{wheel.name.toUpperCase()}</small><strong>{formatDayLong(wheels[wheel.id]) || '—'}</strong><Pill kind={wheelStatus.kind}>{wheelStatus.pill}</Pill></div>; })}
        </div>
        <div className="tg-row"><span className="tg-duo"><Icon name="clock" size={22} /></span><span className="tg-row-main"><span className="tg-row-top"><strong>OXIRGI ALMASHTIRISH</strong></span><span className="tg-row-sub"><span>{formatDayShort(latest.performed_on)}{latest.odometer_km ? ` · ${formatKm(latest.odometer_km)}` : ''}</span></span></span></div>
      </> : <>
        <div className="tg-next"><small>KEYINGI ALMASHTIRISH</small><strong className={status.kind}>{latest.next_due_on ? formatDayLong(latest.next_due_on) : 'Belgilanmagan'}</strong><span className="tg-bar" aria-hidden="true"><i className={status.kind} style={{ width: `${status.progress}%` }} /></span><span className="tg-row-sub"><span>{formatDayShort(latest.performed_on)} dan</span><b className={status.kind}>{status.note}</b></span></div>
      </>}
    {list.length > 0 && <><h2 className="tg-section">Tarix</h2><div className="tg-history">{list.map(record => <div className="tg-hist" key={record.id}><Icon name="calendar" size={18} /><strong>{formatRange(record.performed_on, record.next_due_on)}</strong><span>{formatKm(record.odometer_km)}</span></div>)}</div></>}
    {role === 'admin' && <Link className="tg-primary tg-bottom-action" to={`/bolimlar/${service.id}/yangi`}><Icon name="plus" size={18} /> Yozuv qo‘shish</Link>}
  </section>;
}

export function Profile() {
  const { role, session, app } = useCabinet();
  const loaded = useVehiclesLoaded();
  const { vehicles } = useCabinet();
  const customer = session.data.customer;
  const person = role === 'admin' ? session.data.profile : customer;
  const name = fullName(person);
  return <section className="tg-page"><h1 className="sr-only">Profil</h1><article className="tg-profile">
    <div className="tg-profile-top"><span className="tg-avatar big" aria-hidden="true">{initials(person)}</span><div><h2>{(name || 'Foydalanuvchi').toUpperCase()}</h2><small>● {role === 'admin' ? 'Administrator' : 'Telegram orqali tasdiqlangan'}</small></div></div>
    {role !== 'admin' && <>
      {loaded.kind === 'loading' && !vehicles.length ? <p className="tg-profile-row muted"><Icon name="car" size={19} /><span>Yuklanmoqda…</span></p> : vehicles.map(vehicle => <p className="tg-profile-row" key={vehicle.id}><Icon name="car" size={19} /><span>{vehicleName(vehicle)}</span><PlateBadge plate={vehicle.plate} /></p>)}
      {customer?.phone && <p className="tg-profile-row"><Icon name="phone" size={19} /><span>{formatPhone(customer.phone)}</span></p>}
      <Link className="tg-edit" to="/profil/tahrir"><Icon name="edit" size={18} /> TAHRIRLASH</Link>
    </>}
    <button type="button" className="tg-logout" onClick={() => app?.close?.()}><Icon name="logout" size={18} /> CHIQISH</button>
  </article></section>;
}

export function Settings() {
  const { app } = useCabinet();
  const bot = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
  return <section className="tg-page"><h1 className="tg-title">Sozlamalar</h1><div className="tg-rows">
    <Link className="tg-row tg-set" to="/yordam"><span className="tg-duo"><Icon name="help" size={22} /></span><span className="tg-row-text"><strong>Yordam</strong><small>Ilovadan foydalanish</small></span><Icon name="right" size={20} className="tg-chev" /></Link>
    {bot && <a className="tg-row tg-set" href={`https://t.me/${bot}`} rel="noopener noreferrer"><span className="tg-duo"><Icon name="send" size={22} /></span><span className="tg-row-text"><strong>Servis boti</strong><small>@{bot}</small></span><Icon name="right" size={20} className="tg-chev" /></a>}
    <button type="button" className="tg-row tg-set" onClick={() => app?.close?.()}><span className="tg-duo"><Icon name="logout" size={22} /></span><span className="tg-row-text"><strong>Chiqish</strong><small>Ilovani yopish</small></span><Icon name="right" size={20} className="tg-chev" /></button>
  </div></section>;
}

export function Help() {
  return <section className="tg-guide"><h1>Qanday foydalaniladi?</h1><ol><li>Servisning Telegram botini oching.</li><li>«Kabinetni ochish» tugmasini bosing.</li><li>Birinchi kirishda telefon raqamingizni Telegram orqali ulashing.</li><li>Mashinalaringiz va xizmatlarning keyingi sanalarini kuzatib boring.</li></ol><p>Alohida parol yaratish talab qilinmaydi — kirish Telegram akkauntingiz orqali.</p><Link className="tg-secondary" to="/">Bosh sahifaga qaytish</Link></section>;
}

export function NotFound({ inline = false }) {
  const content = <Empty title="Sahifa topilmadi" action={<Link className="tg-primary" to="/">Bosh sahifaga</Link>}>Manzil noto‘g‘ri yoki sahifa mavjud emas.</Empty>;
  return inline ? <section className="tg-page">{content}</section> : <section className="tg-welcome">{content}</section>;
}
