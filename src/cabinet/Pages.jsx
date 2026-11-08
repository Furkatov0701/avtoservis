import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon, TireArt } from './Icon';
import { demoClients, services } from './demo';
import { Shell, ScreenHeading, Search, Button, DataState, StateCard, VehicleContext, ChooseVehicle, useCabinet, usePreview } from './UI';

export function Home() {
  const { path } = useCabinet();
  return <Shell title="Bosh sahifa" hideBack><ScreenHeading>Bosh sahifa</ScreenHeading><DataState emptyTitle="Hozircha aksiyalar yo‘q"><Link to={path('xizmatlar')} className="promotion"><div><p>15 % — AKSIYA</p><h2>BALONLAR</h2><span className="promo-sample">Namuna taklif</span></div><TireArt /></Link></DataState></Shell>;
}

export function Clients() {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(6);
  const { showNotice } = usePreview();
  const filtered = demoClients.filter(client => `${client.name} ${client.phone}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <Shell title="Mijozlar" backTo="/admin/bosh-sahifa"><ScreenHeading>Mijozlar</ScreenHeading><div className="search-row"><Search value={search} onChange={value => { setSearch(value); setLimit(6); }} placeholder="Mijoz qidirish…" label="Ism yoki telefon orqali mijoz qidirish" /><Link className="add-button" to="/admin/mijoz-qoshish" aria-label="Mijoz qo‘shish"><Icon name="plus" size={27} /></Link></div><DataState emptyTitle="Mijozlar hali yo‘q">{filtered.length ? <><table className="client-table"><caption className="sr-only">Namuna mijozlar ro‘yxati</caption><thead className="sr-only"><tr><th>Tartib</th><th>Ism-familiya</th><th>Amal</th></tr></thead><tbody>{filtered.slice(0, limit).map((client, i) => <tr key={client.id}><td>{i + 1}</td><td>{client.name}</td><td><button onClick={() => showNotice('Mijoz tafsiloti', 'Mijoz ma’lumotlari va unga biriktirilgan avtomobillar shu yerda ochiladi. Ushbu qo‘shimcha ekran mijozlar bosqichida kelishilib, ulanadi.')} aria-label={`${client.name} — ko‘rish`}>Ko‘rish</button></td></tr>)}</tbody></table>{limit < filtered.length && <button className="load-more" onClick={() => setLimit(value => value + 6)}>Yana…</button>}</> : <StateCard title="Mijoz topilmadi">Boshqa ism yoki telefon raqami bilan qidiring.</StateCard>}</DataState></Shell>;
}

export function Cars() {
  const { role, cars, car } = useCabinet();
  const { showNotice } = usePreview();
  const [search, setSearch] = useState('');
  const filtered = cars.filter(item => `${item.model} ${item.plate}`.toLowerCase().replaceAll(' ', '').includes(search.trim().toLowerCase().replaceAll(' ', '')));
  return <Shell title="Mashinalar" backTo={role === 'admin' ? '/admin/bosh-sahifa' : '/kirish'}><ScreenHeading>Mashinalar</ScreenHeading><div className="search-row"><Search value={search} onChange={setSearch} placeholder="Mashina qidirish…" label="Model yoki davlat raqami bo‘yicha qidirish" /><button className="add-button" aria-label="Avtomobil qo‘shish" onClick={() => showNotice('Avtomobil qo‘shish', 'Bu imkoniyat tasdiqlangan. Avtomobil formasi va bazaga saqlash avtomobillar bosqichida ulanadi. Hozirgi ekran — UI namunasi.')}><Icon name="plus" /></button></div><DataState emptyTitle="Avtomobillar hali yo‘q">{filtered.length ? <div className="card-grid">{filtered.map(item => <Link key={item.id} to={`/${role}/xizmatlar?car=${item.id}`} className={`tile car-tile ${car?.id === item.id ? 'selected-tile' : ''}`}><Icon name="car" size={62} /><h2>{item.model}</h2><span className="plate">{item.plate}</span>{car?.id === item.id && <span className="selected-mark"><Icon name="check" size={15} /><span className="sr-only">Tanlangan</span></span>}</Link>)}</div> : <StateCard title="Mashina topilmadi">Model yoki davlat raqamini qayta tekshiring.</StateCard>}</DataState></Shell>;
}

export function Services() {
  const { role, car, path } = useCabinet();
  const [search, setSearch] = useState('');
  const filtered = services.filter(service => service.name.toLowerCase().includes(search.trim().toLowerCase()));
  return <Shell title={role === 'admin' ? 'Bo‘limlar' : 'Xizmatlar'} backTo={path('mashinalar')}><ScreenHeading>Xizmat bo‘limlari</ScreenHeading><VehicleContext /><Search value={search} onChange={setSearch} placeholder="Bo‘lim qidirish…" /><DataState>{!car ? <ChooseVehicle /> : filtered.length ? <div className={role === 'admin' ? 'service-list' : 'card-grid'}>{filtered.map(service => <Link className={role === 'admin' ? 'service-row' : 'tile service-tile'} key={service.id} to={path(`xizmatlar/${service.id}`)}><Icon name={service.icon} size={role === 'admin' ? 53 : 58} /><h2>{service.name}</h2>{role === 'admin' && <Icon name="down" size={18} className="row-arrow" />}</Link>)}</div> : <StateCard title="Bo‘lim topilmadi">Balonlar, motor moyi, tonirovka yoki antifrizni qidiring.</StateCard>}</DataState></Shell>;
}

export function ServiceDetail() {
  const { serviceId } = useParams();
  const { role, car, path } = useCabinet();
  const { showNotice } = usePreview();
  const navigate = useNavigate();
  const service = services.find(item => item.id === serviceId);
  const [historyOpen, setHistoryOpen] = useState(false);
  if (!service) return <NotFound />;
  const date = car?.id === 'sample-2' ? '12 iyun 2026' : '01 may 2026';
  return <Shell title={service.name} backTo={path('xizmatlar')}><ScreenHeading>{service.name}</ScreenHeading><VehicleContext /><div className="service-select-wrap"><label className="sr-only" htmlFor="service-select">Xizmat turini tanlang</label><select id="service-select" className="service-select" value={service.id} onChange={e => { setHistoryOpen(false); navigate(path(`xizmatlar/${e.target.value}`)); }}>{services.map(item => <option key={item.id} value={item.id}>{item.name.toUpperCase()}</option>)}</select><Icon name="down" size={20} /></div><DataState>{!car ? <ChooseVehicle /> : <>{service.id === 'balonlar' ? <div className="card-grid tires-grid">{[1, 2, 3, 4].map(number => <button key={number} className="tile tire-tile" onClick={() => showNotice(`G‘ildirak ${number}`, 'Bu kartochkada g‘ildirakning xizmat sanasi va tarixi ko‘rinadi. Joylashuv nomlari va haqiqiy ma’lumotlar xizmatlar bosqichida ulanadi.')}><Icon name="tires" size={53} /><h2>G‘ildirak {number}</h2><span>Ma’lumot yo‘q</span></button>)}</div> : <><div className="date-card"><Icon name="calendar" size={40} /><div><div className="date-line"><span>Bajarilgan</span><strong>{date}</strong></div><div className="date-line"><span>Keyingi xizmat</span><strong>Belgilanmagan</strong></div></div></div><button className="history-toggle" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}>Xizmatlar tarixi <Icon name="down" size={18} className={historyOpen ? 'rotate' : ''} /></button>{historyOpen && <ol className="history-list"><li><span className="history-dot" /><div><strong>{date}</strong><p>{service.name} — namuna yozuvi</p><small>{car.model} · {car.plate}</small></div></li></ol>}</>}{role === 'admin' && <Button secondary className="add-service" onClick={() => showNotice('Xizmat yozuvi', 'Xizmatni faqat admin kiritadi. Yozuv formasi, sanalar va tarixni saqlash xizmatlar bosqichida ulanadi.')}><Icon name="plus" size={21} /> Xizmat yozuvi qo‘shish</Button>}</>}</DataState></Shell>;
}

export function Profile() {
  const { role, car, path } = useCabinet();
  const { showNotice } = usePreview();
  const navigate = useNavigate();
  return <Shell title="Profil" noNav backTo={path('mashinalar')}><ScreenHeading>Profil</ScreenHeading><DataState><article className="profile-card"><h2>{role === 'admin' ? 'NAMUNA ADMIN' : 'NAMUNA FOYDALANUVCHI'}</h2><div className="profile-row"><Icon name="car" size={25} />{car ? <><span>{car.model}</span><span className="plate mini-plate">{car.plate}<i>UZ</i></span></> : <Link to={path('mashinalar')} className="inline-link">Avtomobilni tanlash</Link>}</div><div className="profile-row"><Icon name="phone" size={23} /><span>+998 (__) ___-__-__</span></div><button className="profile-action edit-action" onClick={() => showNotice('Profilni tahrirlash', 'User o‘z ism-familiyasini tahrirlay oladi. Forma va serverga saqlash profil bosqichida ulanadi. Telefonni almashtirish alohida tasdiqlashni talab qiladi.')}><Icon name="edit" size={24} /> TAHRIRLASH</button><button className="profile-action" onClick={() => showNotice('Parolni almashtirish', 'O‘z parolingizni almashtirish imkoniyati Supabase Auth bilan ulanadi. Ushbu UI namunasi parolni saqlamaydi.')}><Icon name="lock" size={22} /> PAROLNI ALMASHTIRISH</button><button className="profile-action" onClick={() => navigate(role === 'admin' ? '/admin/kirish' : '/kirish', { replace: true })}><Icon name="logout" size={24} /> CHIQISH</button></article></DataState></Shell>;
}

export function NotFound() {
  return <Shell title="Sahifa topilmadi" backTo="/user/mashinalar" noNav><StateCard title="Sahifa topilmadi" action={<Link className="button-primary" to="/user/mashinalar">Mashinalarga qaytish</Link>}>Manzil noto‘g‘ri yoki ushbu sahifa mavjud emas.</StateCard></Shell>;
}
