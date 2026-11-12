import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { normalizePhone } from '../validation';
import { useCabinet } from './context';
import { AddButton, capitalizeSentence, capitalizeWords, Combobox, DeleteConfirm, EditLink, Empty, Failure, FormPage, Notice, PlateInput, PrimaryButton, SearchBar, TextField } from './ui';
import { makeSuggestions, modelSuggestions } from './cars';
import { addDays, addMonths, DateField } from './datepicker';
import { formatPhone, fullName, initials, maskPhoneInput, MAX_KM, MIN_PRODUCTION_YEAR, maxProductionYear, ODOMETER_SERVICES, PLATE_BODY, recordsFor, sentenceCase, serviceById, splitPlate, tireWheels, titleCase, vehicleName } from './format';

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
          ? <tr key={customer.id}><td className="tg-num">{index + 1}</td><td className="tg-name"><span className="tg-person"><span className="tg-mini-ava" aria-hidden="true">{initials(customer)}<i className={customer.linked ? 'on' : ''} /></span><span><strong>{fullName(customer)}</strong><small>{customer.linked ? formatPhone(customer.phone) : 'Botga ulanmagan'}</small></span></span></td><td className="tg-cell-action"><span><EditLink to={`/mijozlar/${customer.id}/tahrir`} label={`${fullName(customer)}: tahrirlash`} /><button type="button" className="tg-chip" onClick={() => open(customer)} aria-label={`${fullName(customer)}: ko‘rish`}>Ko‘rish</button></span></td></tr>
          : <tr key={`empty-${index}`} aria-hidden="true" className="empty"><td className="tg-num">{index + 1}</td><td className="tg-name" /><td className="tg-cell-action" /></tr>;
      })}</tbody></table>{list.length > limit && <button type="button" className="tg-more" onClick={() => setLimit(value => value + PAGE)}>Yana....</button>}</>}
  </section>;
}

// Add a customer (/mijozlar/yangi) or correct one (/mijozlar/:customerId/tahrir).
export function CustomerForm() {
  const { customerId } = useParams();
  const { request, customers, loadCustomers, setCustomers, selectedCustomer, selectCustomer, replaceSelectedCustomer, resetAdminVehicles, loadOverview, goBack } = useCabinet();
  const navigate = useNavigate();
  const list = customers.data || [];
  const existing = customerId ? list.find(item => item.id === customerId) || (selectedCustomer?.id === customerId ? selectedCustomer : null) : null;
  const [phone, setPhone] = useState(() => (existing ? maskPhoneInput(existing.phone) : ''));
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (customerId && !existing && customers.kind === 'idle') loadCustomers().catch(() => {}); }, [customerId, existing, customers.kind, loadCustomers]);
  useEffect(() => { if (existing && !phone) setPhone(maskPhoneInput(existing.phone)); }, [existing]); // eslint-disable-line react-hooks/exhaustive-deps
  if (customerId && !existing) return <FormPage title="Mijozni tahrirlash" subtitle="Admin">{customers.kind === 'loading' || customers.kind === 'idle' ? <Empty loading title="Yuklanmoqda…" /> : <Empty title="Mijoz topilmadi" action={<Link className="tg-secondary" to="/mijozlar">Mijozlarni ochish</Link>} />}</FormPage>;
  const clearError = name => setErrors(current => (current[name] ? { ...current, [name]: undefined } : current));
  const submit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = titleCase(String(form.get('firstName') || '').trim());
    const lastName = titleCase(String(form.get('lastName') || '').trim());
    const normalized = normalizePhone(phone);
    const found = {};
    if (!firstName) found.firstName = 'Ismni kiriting.';
    if (!lastName) found.lastName = 'Familiyani kiriting.';
    if (!normalized) found.phone = 'Raqamni +998 va 9 ta raqam bilan kiriting.';
    setErrors(found); setFailure('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const customer = { firstName, lastName, phone: normalized };
      if (existing) {
        const data = await request('admin-update-customer', { customerId: existing.id, customer });
        const row = { ...existing, first_name: data.customer.firstName, last_name: data.customer.lastName, phone: data.customer.phone, linked: data.customer.linked };
        setCustomers({ kind: 'ready', data: list.map(item => (item.id === row.id ? row : item)) });
        if (selectedCustomer?.id === row.id) replaceSelectedCustomer(row);
        resetAdminVehicles(); loadOverview().catch(() => {});
        goBack();
      } else {
        const data = await request('admin-create-customer', { customer });
        const row = { id: data.customer.id, first_name: data.customer.firstName, last_name: data.customer.lastName, phone: data.customer.phone, linked: false };
        if (customers.kind === 'ready') setCustomers({ kind: 'ready', data: [row, ...list] });
        selectCustomer(row);
        navigate('/mashinalar', { replace: true });
      }
    } catch (error) {
      setFailure(error.code === 'customer_exists' ? 'Bu telefon raqami bilan boshqa mijoz allaqachon qo‘shilgan.' : error.code === 'invalid_customer' ? 'Ma’lumotlarni tekshirib, qayta kiriting.' : error.code === 'customer_not_found' ? 'Mijoz topilmadi: u allaqachon o‘chirilgan bo‘lishi mumkin.' : 'Mijozni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setFailure('');
    try {
      await request('admin-delete-customer', { customerId: existing.id });
      setCustomers({ kind: 'ready', data: list.filter(item => item.id !== existing.id) });
      if (selectedCustomer?.id === existing.id) selectCustomer(null);
      resetAdminVehicles(); loadOverview().catch(() => {});
      navigate('/mijozlar', { replace: true });
    } catch { setFailure('Mijozni o‘chirib bo‘lmadi. Qayta urinib ko‘ring.'); setBusy(false); }
  };
  return <FormPage title={existing ? 'Mijozni tahrirlash' : 'Mijoz qo‘shish'} subtitle={existing ? fullName(existing) : 'Admin'}><form className="tg-form" onSubmit={submit} noValidate>
    <div className="tg-form-row"><TextField label="Ism" name="firstName" required maxLength="80" placeholder="Ali" autoComplete="off" autoCapitalize="words" defaultValue={existing?.first_name || ''} onInput={event => { capitalizeWords(event); clearError('firstName'); }} error={errors.firstName} /><TextField label="Familiya" name="lastName" required maxLength="80" placeholder="Valiyev" autoComplete="off" autoCapitalize="words" defaultValue={existing?.last_name || ''} onInput={event => { capitalizeWords(event); clearError('lastName'); }} error={errors.lastName} /></div>
    <TextField label="Telefon raqami" name="phone" required inputMode="tel" placeholder="+998 (97) 123-45-67" value={phone} onChange={event => { setPhone(maskPhoneInput(event.target.value)); clearError('phone'); }} error={errors.phone} hint={existing?.linked ? 'Mijoz botga ulangan: raqam o‘zgarsa ham kabineti ochiq qoladi.' : 'Mijoz shu raqamni Telegram orqali ulashganda kabineti ochiladi.'} />
    <Notice kind="error">{failure}</Notice>
    <PrimaryButton type="submit" busy={busy}>{existing ? 'Saqlash' : 'Qo‘shish'}</PrimaryButton>
    {existing && <div className="tg-form-danger"><DeleteConfirm label="Mijozni o‘chirish" question="Mijoz, uning barcha mashinalari va xizmat yozuvlari butunlay o‘chiriladi. Ishonchingiz komilmi?" onConfirm={remove} busy={busy} /></div>}
    <CancelLink />
  </form></FormPage>;
}

// Add a vehicle (/mashinalar/yangi, admin) or correct one (/mashinalar/:vehicleId/tahrir, admin or its owner).
export function VehicleForm() {
  const { vehicleId } = useParams();
  const { role, request, vehicles, selectedCustomer, loadAdminVehicles, resetAdminVehicles, loadUserVehicles, selectVehicle, recordCache, loadOverview, goBack } = useCabinet();
  const navigate = useNavigate();
  const existing = vehicleId ? vehicles.find(item => item.id === vehicleId) : null;
  const plate = splitPlate(existing?.plate || '');
  const [make, setMake] = useState(existing?.make || '');
  const [model, setModel] = useState(existing?.model || '');
  const [region, setRegion] = useState(plate.region || '');
  const [plateBody, setPlateBody] = useState((plate.number || '').replace(/\s/g, ''));
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const admin = role === 'admin';
  if (vehicleId && !existing) return <FormPage title="Mashinani tahrirlash"><Empty title="Mashina topilmadi" action={<Link className="tg-secondary" to="/mashinalar">Mashinalarni ochish</Link>} /></FormPage>;
  if (!vehicleId && (!admin || !selectedCustomer)) return <FormPage title="Mashina qo‘shish" subtitle="Admin"><Empty title="Avval mijozni tanlang" action={<Link className="tg-secondary" to="/mijozlar">Mijozlarni ochish</Link>} /></FormPage>;
  const maxYear = maxProductionYear();
  const recordCount = existing ? (recordCache[existing.id]?.kind === 'ready' ? recordCache[existing.id].list : existing.service_records || []).length : 0;
  // A field's error disappears as soon as the field is changed.
  const clearError = name => setErrors(current => (current[name] ? { ...current, [name]: undefined } : current));
  const refresh = async () => { if (admin) { await loadAdminVehicles(); loadOverview().catch(() => {}); } else await loadUserVehicles(); };
  const submit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const productionYear = String(form.get('productionYear') || '').trim();
    const found = {};
    if (!model.trim()) found.model = 'Modelni kiriting.';
    if (!/^\d{2}$/.test(region) || !PLATE_BODY.test(plateBody)) found.plate = 'Hudud kodi 2 raqam, qolgani 6 belgi: A123BC yoki 123ABC.';
    if (productionYear && (!/^\d{4}$/.test(productionYear) || Number(productionYear) < MIN_PRODUCTION_YEAR || Number(productionYear) > maxYear)) found.productionYear = `Yil ${MIN_PRODUCTION_YEAR} dan ${maxYear} gacha bo‘lsin.`;
    setErrors(found); setFailure('');
    if (Object.keys(found).length) return;
    setBusy(true);
    const vehicle = { make: make.trim(), model: model.trim(), plate: `${region}${plateBody}`, productionYear };
    try {
      if (existing) {
        await request(admin ? 'admin-update-vehicle' : 'customer-update-vehicle', { vehicleId: existing.id, vehicle });
        await refresh();
        goBack();
      } else {
        const data = await request('admin-create-vehicle', { customerId: selectedCustomer.id, vehicle });
        await loadAdminVehicles();
        selectVehicle(data.vehicle.id);
        navigate('/mashinalar', { replace: true });
      }
    } catch (error) { setFailure(error.code === 'vehicle_not_found' ? 'Mashina topilmadi: u o‘chirilgan bo‘lishi mumkin.' : 'Mashinani saqlab bo‘lmadi. Maydonlarni tekshirib, qayta urinib ko‘ring.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setFailure('');
    try {
      await request(admin ? 'admin-delete-vehicle' : 'customer-delete-vehicle', { vehicleId: existing.id });
      selectVehicle(null);
      if (admin) { resetAdminVehicles(); loadOverview().catch(() => {}); } else await loadUserVehicles();
      navigate('/mashinalar', { replace: true });
    } catch (error) { setFailure(error.code === 'vehicle_has_records' ? 'Bu mashinada servis tarixi bor. O‘chirish uchun servis administratoriga murojaat qiling.' : 'Mashinani o‘chirib bo‘lmadi. Qayta urinib ko‘ring.'); setBusy(false); }
  };
  // Customers never lose the service's history: a vehicle with records is removed only by the admin.
  const canDelete = existing && (admin || recordCount === 0);
  const question = recordCount ? `Mashina va uning ${recordCount} ta xizmat yozuvi butunlay o‘chiriladi. Ishonchingiz komilmi?` : 'Mashina butunlay o‘chiriladi. Ishonchingiz komilmi?';
  return <FormPage title={existing ? 'Mashinani tahrirlash' : 'Mashina qo‘shish'} subtitle={existing ? (admin && existing.customers ? fullName(existing.customers) : vehicleName(existing)) : fullName(selectedCustomer)}><form className="tg-form" onSubmit={submit} noValidate>
    <div className="tg-form-row">
      <Combobox label="Markasi" name="make" value={make} onChange={setMake} placeholder="Chevrolet" suggestions={makeSuggestions(make)} onPick={item => { setMake(item.make); if (item.model) { setModel(item.model); clearError('model'); } }} />
      <Combobox label="Modeli" name="model" required value={model} onChange={value => { setModel(value); clearError('model'); }} placeholder="Malibu 2" suggestions={modelSuggestions(model, make)} onPick={item => { setModel(item.model); clearError('model'); if (!make) setMake(item.make); }} error={errors.model} />
    </div>
    <PlateInput region={region} body={plateBody} onRegion={value => { setRegion(value); clearError('plate'); }} onBody={value => { setPlateBody(value); clearError('plate'); }} error={errors.plate} />
    <TextField label="Ishlab chiqarilgan yili" name="productionYear" inputMode="numeric" maxLength="4" placeholder="2022" defaultValue={existing?.production_year ?? ''} hint={`${MIN_PRODUCTION_YEAR}–${maxYear}`} onInput={event => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4); clearError('productionYear'); }} error={errors.productionYear} />
    <Notice kind="error">{failure}</Notice>
    <PrimaryButton type="submit" busy={busy}>{existing ? 'Saqlash' : 'Qo‘shish'}</PrimaryButton>
    {existing && <div className="tg-form-danger">{canDelete ? <DeleteConfirm label="Mashinani o‘chirish" question={question} onConfirm={remove} busy={busy} /> : <p className="tg-form-note">Bu mashinada servis tarixi bor, shuning uchun uni faqat servis administratori o‘chira oladi.</p>}</div>}
    <CancelLink />
  </form></FormPage>;
}

// Create a record (/bolimlar/:serviceId/yangi) or correct one (/bolimlar/:serviceId/:recordId/tahrir).
export function RecordForm() {
  const { serviceId, recordId } = useParams();
  const { request, selectedVehicle, loadRecords, recordCache, goBack } = useCabinet();
  const focusWheel = useLocation().state?.wheel;
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [performed, setPerformed] = useState(null);
  const service = serviceById[serviceId];
  const records = selectedVehicle ? recordCache[selectedVehicle.id]?.list || selectedVehicle.service_records || [] : [];
  const existing = recordId ? recordsFor(records, serviceId).find(record => record.id === recordId) : null;
  if (!service || !selectedVehicle || (recordId && !existing)) return <FormPage title="Ma’lumot" subtitle="Admin"><Empty title={!service ? 'Xizmat topilmadi' : !selectedVehicle ? 'Avval mashinani tanlang' : 'Yozuv topilmadi'} action={<Link className="tg-secondary" to="/mashinalar">Mashinalarni ochish</Link>} /></FormPage>;
  const tires = service.id === 'tires';
  const withKm = ODOMETER_SERVICES.has(service.id);
  const wheels = existing?.tire_positions || {};
  const todayIso = today();
  const performedOn = performed ?? existing?.performed_on ?? todayIso;
  // Quick choices: the performed date offers today/yesterday; next dates count from the performed date.
  const performedQuick = [{ label: 'Bugun', value: todayIso }, { label: 'Kecha', value: addDays(todayIso, -1) }];
  const clearError = name => setErrors(current => (current[name] ? { ...current, [name]: undefined } : current));
  const nextQuick = [{ label: '+3 oy', value: addMonths(performedOn, 3) }, { label: '+6 oy', value: addMonths(performedOn, 6) }, { label: '+1 yil', value: addMonths(performedOn, 12) }];
  const submit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = name => String(form.get(name) || '').trim();
    const performedValue = value('performedOn');
    const record = { serviceType: service.id, performedOn: performedValue, notes: sentenceCase(value('notes')) };
    if (withKm) record.odometerKm = value('odometerKm').replace(/\s/g, '');
    const found = {};
    if (!performedValue) found.performedOn = 'Bajarilgan sanani kiriting.';
    if (tires) {
      record.tirePositions = Object.fromEntries(tireWheels.map(wheel => [wheel.id, value(wheel.id)]));
      tireWheels.forEach(wheel => { if (record.tirePositions[wheel.id] && performedValue && record.tirePositions[wheel.id] < performedValue) found[wheel.id] = 'Bajarilgan sanadan oldin bo‘lmasin.'; });
      if (!Object.values(record.tirePositions).some(Boolean)) found.front_left = 'Kamida bitta balon sanasini kiriting.';
    } else {
      record.nextDueOn = value('nextDueOn');
      if (record.nextDueOn && performedValue && record.nextDueOn < performedValue) found.nextDueOn = 'Bajarilgan sanadan oldin bo‘lmasin.';
    }
    if (withKm && record.odometerKm && (!/^\d{1,7}$/.test(record.odometerKm) || Number(record.odometerKm) > MAX_KM)) found.odometerKm = 'Kilometrni butun son bilan kiriting.';
    setErrors(found); setFailure('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      if (existing) await request('admin-update-service-record', { recordId: existing.id, record });
      else await request('admin-create-service-record', { vehicleId: selectedVehicle.id, record });
      await loadRecords(selectedVehicle.id);
      goBack();
    } catch { setFailure('Ma’lumotni saqlab bo‘lmadi. Sanalarni tekshirib, qayta urinib ko‘ring.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setFailure('');
    try { await request('admin-delete-service-record', { recordId: existing.id }); await loadRecords(selectedVehicle.id); goBack(); }
    catch { setFailure('Yozuvni o‘chirib bo‘lmadi. Qayta urinib ko‘ring.'); setBusy(false); }
  };
  const plate = splitPlate(selectedVehicle.plate);
  return <FormPage title={existing ? `${service.name}: tahrirlash` : service.name} subtitle={`${vehicleName(selectedVehicle)} · ${plate.region} ${plate.number}`.trim()}><form className="tg-form" onSubmit={submit} noValidate>
    <DateField label="Bajarilgan sana" name="performedOn" required defaultValue={performedOn} quick={performedQuick} sheetTitle="Bajarilgan sana" onChange={value => { setPerformed(value); clearError('performedOn'); }} error={errors.performedOn} />
    {tires ? <><p className="tg-form-note">Har bir balonning keyingi almashtirish sanasi</p><div className="tg-form-row">{tireWheels.map(wheel => <div key={wheel.id} className={focusWheel === wheel.id ? 'tg-focus-wheel' : ''}><DateField label={wheel.name} name={wheel.id} defaultValue={wheels[wheel.id] || ''} start={addMonths(performedOn, 6)} quick={nextQuick} sheetTitle={`${wheel.name} — keyingi sana`} autoOpen={focusWheel === wheel.id} onChange={() => clearError(wheel.id)} error={errors[wheel.id]} /></div>)}</div></>
      : <DateField label="Keyingi almashtirish sanasi" name="nextDueOn" defaultValue={existing?.next_due_on || ''} start={addMonths(performedOn, 6)} quick={nextQuick} sheetTitle="Keyingi almashtirish sanasi" onChange={() => clearError('nextDueOn')} error={errors.nextDueOn} />}
    {withKm && <TextField label="Kilometr" name="odometerKm" inputMode="numeric" maxLength="9" placeholder="85000" defaultValue={existing?.odometer_km ?? ''} error={errors.odometerKm} />}
    <div className="tg-field"><label htmlFor="notes">Izoh</label><textarea id="notes" name="notes" maxLength="2000" rows="3" defaultValue={existing?.notes || ''} onInput={capitalizeSentence} /></div>
    <Notice kind="error">{failure}</Notice>
    <PrimaryButton type="submit" busy={busy}>Saqlash</PrimaryButton>
    {existing && <div className="tg-form-danger"><DeleteConfirm label="Yozuvni o‘chirish" question="Bu yozuv butunlay o‘chiriladi. Ishonchingiz komilmi?" onConfirm={remove} busy={busy} /></div>}
    <CancelLink />
  </form></FormPage>;
}
