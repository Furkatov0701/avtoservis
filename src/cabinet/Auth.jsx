import { useCallback, useEffect, useState } from 'react';
import { Link, useBeforeUnload, useBlocker, useLocation } from 'react-router-dom';
import { Button, Field, Modal } from './UI';
import { Icon } from './Icon';
import { normalizePhone, validateAuth } from './validation';

export default function Auth() {
  const { pathname } = useLocation();
  const admin = pathname.startsWith('/admin');
  const adding = pathname.endsWith('/mijoz-qoshish');
  const registering = adding || pathname.endsWith('/taklif') || pathname === '/royxatdan-otish';
  useEffect(() => { document.title = `${adding ? 'Mijoz qo‘shish' : registering ? 'Akkount yaratish' : 'Kirish'} — Avto`; }, [adding, registering]);
  const [values, setValues] = useState({ firstName: '', lastName: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [help, setHelp] = useState(false);
  const dirty = Object.values(values).some(Boolean);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(useCallback(e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }, [dirty]));
  const set = (name) => (event) => { const value = event.target.value; setValues(previous => ({ ...previous, [name]: value })); setErrors(previous => ({ ...previous, [name]: undefined })); setNotice(''); };
  const submit = (e) => {
    e.preventDefault();
    const next = validateAuth(values, registering);
    setErrors(next);
    if (Object.keys(next).length) { document.getElementById(Object.keys(next)[0])?.focus(); return; }
    setValues(previous => ({ ...previous, phone: normalizePhone(previous.phone) }));
    setNotice(admin && registering ? 'Bu UI namunasi. Admin taklifi va akkaunt yaratish server orqali keyingi bosqichda ulanadi. Hozir akkaunt yaratilmadi.' : 'Bu UI namunasi. Haqiqiy kirish va akkaunt yaratish Supabase bosqichida ulanadi. Ma’lumotlar serverga yuborilmadi.');
  };
  return <div className="app-surface auth-surface"><main id="main-content" tabIndex={-1} className="auth-main">{adding && <Link className="icon-button auth-back" to="/admin/mijozlar" aria-label="Mijozlarga qaytish"><Icon name="back" /></Link>}<div className="auth-title"><h1>{adding ? 'Mijoz qo‘shish' : registering ? 'Akkount yaratish' : 'Xush kelibsiz!'}</h1><p>{admin ? 'Admin' : 'User'}</p></div><form className={`auth-form ${registering ? 'register-form' : 'login-form'}`} onSubmit={submit} noValidate>
    {registering && <div className="grid grid-cols-2 gap-3"><Field label="Ism" name="firstName" value={values.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" placeholder="Ismingiz" maxLength={60} required /><Field label="Familiya" name="lastName" value={values.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" placeholder="Familiyangiz" maxLength={60} required /></div>}
    <Field label="Telefon raqami" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} error={errors.phone} placeholder="+998 (__) ___-__-__" maxLength={22} required />
    <Field label="Parol" name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} value={values.password} onChange={set('password')} error={errors.password} placeholder="Parolingiz" maxLength={128} required />
    {registering && <Field label="Parolni tasdiqlang" name="confirm" type="password" autoComplete="new-password" value={values.confirm} onChange={set('confirm')} error={errors.confirm} placeholder="Parolni takrorlang" maxLength={128} required />}
    {notice && <p role="status" className="form-notice">{notice}</p>}
    <Button type="submit" className="auth-submit">{adding ? 'Qo‘shish' : registering ? 'Ro‘yxatdan o‘tish' : 'Kirish'}</Button>
    {!registering && <div className="auth-links">{admin ? <button type="button" onClick={() => setHelp(true)}>Admin taklifi haqida</button> : <Link to="/royxatdan-otish">Ro‘yxatdan o‘tish</Link>}<button type="button" onClick={() => setHelp(true)}>Parolni unutdingizmi?</button></div>}
    {registering && !adding && <Link className="auth-login-link" to={admin ? '/admin/kirish' : '/kirish'}>Akkauntingiz bormi? Kirish</Link>}
  </form></main><Modal open={help} onClose={() => setHelp(false)} title={admin ? 'Admin akkaunti' : 'Parolni tiklash'}><p>{admin ? 'Admin akkaunti xavfsiz taklif yoki dastlabki sozlash orqali ochiladi. Ochiq admin ro‘yxatdan o‘tishi yoqilmagan.' : 'Telefonni tasdiqlash va parolni tiklash SMS provayderi bilan autentifikatsiya bosqichida ulanadi. Hozir SMS yuborilmaydi.'}</p></Modal><Modal open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()} title="Formadan chiqasizmi?" actions={<><Button secondary onClick={() => blocker.reset?.()}>Qolish</Button><Button onClick={() => blocker.proceed?.()}>Chiqish</Button></>}><p>Kiritilgan ma’lumotlar saqlanmagan. Chiqsangiz, ular yo‘qoladi.</p></Modal></div>;
}
