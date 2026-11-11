import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { normalizePhone } from '../validation';
import { useCabinet } from './context';
import { AddButton, Empty, Failure, FormPage, Notice, PrimaryButton, SearchBar, TextField } from './ui';
import { formatPhone, fullName, initials, maskPhoneInput, serviceById, tireWheels, vehicleName } from './format';

const PAGE = 6;
const normalize = value => (value || '').toLocaleLowerCase('uz').replace(/\s+/g, '');

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function CancelLink() {
  const { goBack } = useCabinet();
  return <button type="button" className="tg-link" onClick={goBack}>Bekor qilish</button>;
}

export function Customers() {
  const { customers, loadCustomers, selectCustomer } = useCabinet();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const navigate = useNavigate();
  const notice = useLocation().state?.notice;
  useEffect(() => { if (customers.kind === 'idle') loadCustomers().catch(() => {}); }, [customers.kind, loadCustomers]);
  const all = customers.data || [];
  const list = all.filter(customer => normalize(`${fullName(customer)} ${customer.phone}`).includes(normalize(query)));
  const shown = list.slice(0, limit);
  const rows = shown.length;
  const open = customer => { selectCustomer(customer); navigate('/mashinalar'); };
  return <section className="tg-page"><h1 className="sr-only">Mijozlar</h1>
    <SearchBar value={query} onChange={value => { setQuery(value); setLimit(PAGE); }} placeholder="Mijoz qidirish..." label="Ism yoki telefon bo‘yicha mijoz qidirish" action={<AddButton to="/mijozlar/yangi" label="Mijoz qo‘shish" />} />
    <Notice>{notice}</Notice>
    {customers.kind === 'error' ? <Failure title="Ro‘yxatni yuklab bo‘lmadi" onRetry={() => loadCustomers().catch(() => {})} />
      : customers.kind !== 'ready' && !all.length ? <Empty loading title="Mijozlar yuklanmoqda…" />
      : !all.length ? <Empty title="Hali mijoz yo‘q">Yashil «+» tugmasi orqali birinchi mijozni qo‘shing.</Empty>
      : !list.length ? <Empty title="Mijoz topilmadi" />
      : <><table className="tg-table" aria-label="Mijozlar ro‘yxati"><tbody>{Array.from({ length: rows }, (_, index) => {
        const customer = shown[index];
        return customer
          ? <tr key={customer.id}><td className="tg-num">{index + 1}</td><td className="tg-name"><span className="tg-person"><span className="tg-mini-ava" aria-hidden="true">{initials(customer)}<i className={customer.linked ? 'on' : ''} /></span><span><strong>{fullName(customer)}</strong><small>{customer.linked ? formatPhone(customer.phone) : 'Botga ulanmagan'}</small></span></span></td><td className="tg-cell-action"><button type="button" className="tg-chip" onClick={() => open(customer)} aria-label={`${fullName(customer)}: ko‘rish`}>Ko‘rish</button></td></tr>
          : <tr key={`empty-${index}`} aria-hidden="true" className="empty"><td className="tg-num">{index + 1}</td><td className="tg-name" /><td className="tg-cell-action" /></tr>;
      })}</tbody></table>{list.length > limit && <button type="button" className="tg-more" onClick={() => setLimit(value => value + PAGE)}>Yana....</button>}</>}
  </section>;
}

export function CustomerCreate() {
  const { request, customers, setCustomers, selectCustomer } = useCabinet();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get('firstName') || '').trim();
    const lastName = String(form.get('lastName') || '').trim();
    const normalized = normalizePhone(phone);
    const found = {};
    if (!firstName) found.firstName = 'Ismni kiriting.';
    if (!lastName) found.lastName = 'Familiyani kiriting.';
    if (!normalized) found.phone = 'Raqamni +998 va 9 ta raqam bilan kiriting.';
    setErrors(found); setFailure('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const data = await request('admin-create-customer', { customer: { firstName, lastName, phone: normalized } });
      const row = { id: data.customer.id, first_name: data.customer.firstName, last_name: data.customer.lastName, phone: data.customer.phone, linked: false };
      if (customers.kind === 'ready') setCustomers({ kind: 'ready', data: [row, ...(customers.data || [])] });
      selectCustomer(row);
      navigate('/mashinalar', { replace: true });
    } catch (error) {
      setFailure(error.code === 'customer_exists' ? 'Bu telefon raqami bilan mijoz allaqachon qo‘shilgan.' : error.code === 'invalid_customer' ? 'Ma’lumotlarni tekshirib, qayta kiriting.' : 'Mijozni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally { setBusy(false); }
  };
  return <FormPage title="Mijoz qo‘shish" subtitle="Admin"><form className="tg-form" onSubmit={submit} noValidate>
    <div className="tg-form-row"><TextField label="Ism" name="firstName" required maxLength="80" placeholder="Ali" autoComplete="off" error={errors.firstName} /><TextField label="Familiya" name="lastName" required maxLength="80" placeholder="Valiyev" autoComplete="off" error={errors.lastName} /></div>
    <TextField label="Telefon raqami" name="phone" required inputMode="tel" placeholder="+998 (97) 123-45-67" value={phone} onChange={event => setPhone(maskPhoneInput(event.target.value))} error={errors.phone} hint="Mijoz shu raqamni Telegram orqali ulashganda kabineti ochiladi." />
    <Notice kind="error">{failure}</Notice>
    <PrimaryButton type="submit" busy={busy}>Qo‘shish</PrimaryButton><CancelLink />
  </form></FormPage>;
}

export function VehicleCreate() {
  const { request, selectedCustomer, loadAdminVehicles, selectVehicle } = useCabinet();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  if (!selectedCustomer) return <FormPage title="Mashina qo‘shish" subtitle="Admin"><Empty title="Avval mijozni tanlang" action={<Link className="tg-secondary" to="/mijozlar">Mijozlarni ochish</Link>} /></FormPage>;
  const submit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const vehicle = { make: String(form.get('make') || '').trim(), model: String(form.get('model') || '').trim(), plate: String(form.get('plate') || '').trim(), productionYear: String(form.get('productionYear') || '').trim() };
    const found = {};
    if (!vehicle.model) found.model = 'Modelni kiriting.';
    if (!vehicle.plate) found.plate = 'Davlat raqamini kiriting.';
    if (vehicle.productionYear && !/^(19|20|21)\d{2}$/.test(vehicle.productionYear)) found.productionYear = 'Yilni to‘rt xonali son bilan kiriting.';
    setErrors(found); setFailure('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const data = await request('admin-create-vehicle', { customerId: selectedCustomer.id, vehicle });
      await loadAdminVehicles();
      selectVehicle(data.vehicle.id);
      navigate('/mashinalar', { replace: true });
    } catch { setFailure('Mashinani saqlab bo‘lmadi. Maydonlarni tekshirib, qayta urinib ko‘ring.'); }
    finally { setBusy(false); }
  };
  return <FormPage title="Mashina qo‘shish" subtitle={fullName(selectedCustomer)}><form className="tg-form" onSubmit={submit} noValidate>
    <div className="tg-form-row"><TextField label="Markasi" name="make" maxLength="80" placeholder="Chevrolet" autoComplete="off" /><TextField label="Modeli" name="model" required maxLength="100" placeholder="Malibu 2" autoComplete="off" error={errors.model} /></div>
    <TextField label="Davlat raqami" name="plate" required maxLength="24" placeholder="30 U 111 UU" autoComplete="off" autoCapitalize="characters" error={errors.plate} />
    <TextField label="Ishlab chiqarilgan yili" name="productionYear" inputMode="numeric" maxLength="4" placeholder="2022" error={errors.productionYear} />
    <Notice kind="error">{failure}</Notice>
    <PrimaryButton type="submit" busy={busy}>Qo‘shish</PrimaryButton><CancelLink />
  </form></FormPage>;
}

export function RecordCreate() {
  const { serviceId } = useParams();
  const { request, selectedVehicle, loadRecords, goBack } = useCabinet();
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const service = serviceById[serviceId];
  if (!service || !selectedVehicle) return <FormPage title="Xizmat yozuvi" subtitle="Admin"><Empty title={service ? 'Avval mashinani tanlang' : 'Xizmat topilmadi'} action={<Link className="tg-secondary" to="/mashinalar">Mashinalarni ochish</Link>} /></FormPage>;
  const tires = service.id === 'tires';
  const submit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = name => String(form.get(name) || '').trim();
    const performedOn = value('performedOn');
    const record = { serviceType: service.id, performedOn, odometerKm: value('odometerKm'), notes: value('notes') };
    const found = {};
    if (!performedOn) found.performedOn = 'Bajarilgan sanani kiriting.';
    if (tires) {
      record.tirePositions = Object.fromEntries(tireWheels.map(wheel => [wheel.id, value(wheel.id)]));
      tireWheels.forEach(wheel => { if (record.tirePositions[wheel.id] && performedOn && record.tirePositions[wheel.id] < performedOn) found[wheel.id] = 'Bajarilgan sanadan oldin bo‘lmasin.'; });
      if (!Object.values(record.tirePositions).some(Boolean)) found.front_left = 'Kamida bitta balon sanasini kiriting.';
    } else {
      record.nextDueOn = value('nextDueOn');
      if (record.nextDueOn && performedOn && record.nextDueOn < performedOn) found.nextDueOn = 'Bajarilgan sanadan oldin bo‘lmasin.';
    }
    if (record.odometerKm && !/^\d{1,9}$/.test(record.odometerKm)) found.odometerKm = 'Kilometrni butun son bilan kiriting.';
    setErrors(found); setFailure('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await request('admin-create-service-record', { vehicleId: selectedVehicle.id, record });
      await loadRecords(selectedVehicle.id);
      goBack();
    } catch { setFailure('Yozuvni saqlab bo‘lmadi. Sanalarni tekshirib, qayta urinib ko‘ring.'); }
    finally { setBusy(false); }
  };
  return <FormPage title={service.name} subtitle={`${vehicleName(selectedVehicle)} · ${selectedVehicle.plate}`}><form className="tg-form" onSubmit={submit} noValidate>
    <TextField label="Bajarilgan sana" name="performedOn" type="date" required defaultValue={today()} error={errors.performedOn} />
    {tires ? <><p className="tg-form-note">Har bir balonni keyingi almashtirish sanasi</p><div className="tg-form-row">{tireWheels.map(wheel => <TextField key={wheel.id} label={wheel.name} name={wheel.id} type="date" error={errors[wheel.id]} />)}</div></>
      : <TextField label="Keyingi almashtirish sanasi" name="nextDueOn" type="date" error={errors.nextDueOn} />}
    <TextField label="Kilometr" name="odometerKm" inputMode="numeric" maxLength="9" placeholder="85000" error={errors.odometerKm} />
    <div className="tg-field"><label htmlFor="notes">Izoh</label><textarea id="notes" name="notes" maxLength="2000" rows="3" /></div>
    <Notice kind="error">{failure}</Notice>
    <PrimaryButton type="submit" busy={busy}>Saqlash</PrimaryButton><CancelLink />
  </form></FormPage>;
}
