import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBeforeUnload, useBlocker, useNavigate } from 'react-router-dom';
import { Button, Field, Modal, StateCard } from '../Primitives';
import { authConfig, supabase } from './client';
import { authError } from './errors';
import { normalizePhone, validateAuth } from '../validation';
import { useAuth } from './AuthProvider';

export default function AccountForm({ flow = 'login' }) {
  const identity = useAuth();
  const navigate = useNavigate();
  const signup = flow === 'signup';
  const recovery = flow === 'recovery';
  const changing = flow === 'password';
  const [step, setStep] = useState('form');
  const [values, setValues] = useState({ firstName: '', lastName: '', phone: '', password: '', confirm: '', oldPassword: '', code: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const submitting = useRef(false);
  const mayLeave = useRef(false);
  const verifiedPhone = useRef(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const seconds = Math.max(0, Math.ceil((retryAt - clock) / 1000));
  const dirty = step !== 'done' && Object.values(values).some(Boolean);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !mayLeave.current && dirty && currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(useCallback(e => { if (!mayLeave.current && dirty) { e.preventDefault(); e.returnValue = ''; } }, [dirty]));
  const home = identity.profile?.role === 'admin' ? '/admin/bosh-sahifa' : '/user/mashinalar';
  useEffect(() => {
    if (identity.status === 'ready' && (flow === 'login' || (signup && step === 'done'))) {
      mayLeave.current = true;
      navigate(home, { replace: true });
    }
  }, [identity.status, flow, signup, step, home, navigate]);
  useEffect(() => { document.title = `${signup ? 'Akkount yaratish' : recovery ? 'Parolni tiklash' : changing ? 'Parolni almashtirish' : 'Kirish'} — Avto`; }, [signup, recovery, changing]);
  const set = name => event => { setValues(previous => ({ ...previous, [name]: event.target.value })); setErrors(previous => ({ ...previous, [name]: undefined })); setError(''); };
  const action = async callback => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try { await callback(); }
    catch (failure) { if (mounted.current) setError(authError(failure)); }
    finally { submitting.current = false; if (mounted.current) setBusy(false); }
  };
  const validate = next => {
    setErrors(next);
    if (Object.keys(next).length) { document.getElementById(Object.keys(next)[0])?.focus(); return false; }
    return true;
  };
  const cooldown = () => { setRetryAt(Date.now() + 60000); setClock(Date.now()); };
  const submit = event => {
    event.preventDefault();
    if (busy) return;
    if ((signup || recovery) && !authConfig.smsEnabled) return;
    if (step === 'verify') {
      if (!validate(/^\d{6}$/.test(values.code) ? {} : { code: 'SMSdagi 6 xonali kodni kiriting.' })) return;
      void action(async () => {
        const { data, error: failure } = await supabase.auth.verifyOtp({ phone: verifiedPhone.current, token: values.code, type: 'sms' });
        if (failure) throw failure;
        if (!data.session || !data.user?.phone_confirmed_at || `+${data.user.phone?.replace(/^\+/, '')}` !== verifiedPhone.current) throw new Error('Phone verification failed');
        setValues(previous => ({ ...previous, code: '', password: '', confirm: '' }));
        setStep(recovery ? 'new-password' : 'done');
      });
      return;
    }
    if (step === 'new-password' || changing) {
      const next = {};
      if (values.password.length < 8) next.password = 'Parol kamida 8 ta belgidan iborat bo‘lsin.';
      if (values.password !== values.confirm) next.confirm = 'Parollar bir xil emas.';
      if (changing && !values.oldPassword) next.oldPassword = 'Hozirgi parolingizni kiriting.';
      if (!validate(next)) return;
      void action(async () => {
        if (changing) {
          const { data, error: failure } = await supabase.auth.signInWithPassword({ phone: identity.user.phone, password: values.oldPassword });
          if (failure) throw failure;
          if (data.user?.id !== identity.user.id) throw new Error('User mismatch');
        } else {
          const { data, error: failure } = await supabase.auth.getUser();
          if (failure) throw failure;
          if (!verifiedPhone.current || `+${data.user?.phone?.replace(/^\+/, '')}` !== verifiedPhone.current) throw new Error('Verification required');
        }
        const { error: failure } = await supabase.auth.updateUser({ password: values.password });
        if (failure) throw failure;
        setValues(previous => ({ ...previous, password: '', confirm: '', oldPassword: '' }));
        mayLeave.current = true;
        setStep('done');
      });
      return;
    }
    if (recovery) {
      if (!validate(normalizePhone(values.phone) ? {} : { phone: 'Raqamni +998 va 9 ta raqam bilan kiriting.' })) return;
      void action(async () => {
        const phone = normalizePhone(values.phone);
        const { error: failure } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
        // A neutral recovery response does not disclose whether an account exists.
        if (failure && failure.code !== 'user_not_found') throw failure;
        verifiedPhone.current = phone; setValues(previous => ({ ...previous, phone }));
        setStep('verify'); cooldown();
      });
      return;
    }
    if (!validate(validateAuth(values, signup))) return;
    void action(async () => {
      const phone = normalizePhone(values.phone);
      if (signup) {
        const { data, error: failure } = await supabase.auth.signUp({ phone, password: values.password, options: { data: { first_name: values.firstName.trim(), last_name: values.lastName.trim() } } });
        if (failure) throw failure;
        if (data.session) {
          await identity.signOut();
          throw new Error('Phone confirmation must be enabled on server');
        }
        verifiedPhone.current = phone;
        setValues(previous => ({ ...previous, phone, password: '', confirm: '' }));
        setStep('verify'); cooldown();
      } else {
        const { data, error: failure } = await supabase.auth.signInWithPassword({ phone, password: values.password });
        if (failure?.code === 'phone_not_confirmed' && authConfig.smsEnabled) {
          const { error: resendError } = await supabase.auth.resend({ type: 'sms', phone });
          if (resendError) throw resendError;
          verifiedPhone.current = phone;
          setValues(previous => ({ ...previous, phone, password: '' }));
          setStep('verify'); cooldown();
          return;
        }
        if (failure) throw failure;
        if (!data.session) throw new Error('No session');
        mayLeave.current = true;
        setValues(previous => ({ ...previous, password: '' }));
      }
    });
  };
  const resend = () => {
    if (seconds || busy) return;
    void action(async () => {
      const result = !recovery
        ? await supabase.auth.resend({ type: 'sms', phone: verifiedPhone.current })
        : await supabase.auth.signInWithOtp({ phone: verifiedPhone.current, options: { shouldCreateUser: false } });
      if (result.error && !(recovery && result.error.code === 'user_not_found')) throw result.error;
      cooldown();
    });
  };
  const locked = (signup || recovery) && !authConfig.smsEnabled;
  const fieldProps = name => ({ name, value: values[name], onChange: set(name), error: errors[name], disabled: busy });
  return <div className="app-surface auth-surface"><main className="auth-main" id="main-content"><div className="auth-title"><h1>{step === 'verify' ? 'Telefonni tasdiqlang' : step === 'new-password' ? 'Yangi parol' : signup ? 'Akkount yaratish' : recovery ? 'Parolni tiklash' : changing ? 'Parolni almashtirish' : 'Xush kelibsiz!'}</h1><p>{signup ? 'User' : 'Avto'}</p></div>
    {locked ? <StateCard title="SMS xizmati hali yoqilmagan" action={<Link className="button-secondary" to="/kirish">Kirishga qaytish</Link>}>Telefonni tasdiqlash va parolni tiklash hozircha mavjud emas.</StateCard> : step === 'done' ? <StateCard title={signup ? 'Telefon tasdiqlandi' : 'Parol yangilandi'} action={<Link className="button-primary" to={home}>Kabinetga o‘tish</Link>}>{signup ? 'Kabinet tayyorlanmoqda…' : 'Keyingi kirishda yangi parolingizdan foydalaning.'}</StateCard> : <form className="auth-form" onSubmit={submit} noValidate>
      {step === 'verify' ? <><p className="verification-note">{recovery ? 'Agar bu raqamga akkaunt bog‘langan bo‘lsa, kelgan SMS kodni kiriting.' : 'Telefoningizga kelgan SMS kodni kiriting.'}<strong>{verifiedPhone.current}</strong></p><Field label="Tasdiqlash kodi" {...fieldProps('code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></> : step === 'new-password' || changing ? <>{changing && <Field label="Hozirgi parol" {...fieldProps('oldPassword')} type="password" autoComplete="current-password" required />}<Field label="Yangi parol" {...fieldProps('password')} type="password" autoComplete="new-password" maxLength={128} required /><Field label="Parolni tasdiqlang" {...fieldProps('confirm')} type="password" autoComplete="new-password" maxLength={128} required /></> : <>{signup && <div className="grid grid-cols-2 gap-3"><Field label="Ism" {...fieldProps('firstName')} autoComplete="given-name" maxLength={80} required /><Field label="Familiya" {...fieldProps('lastName')} autoComplete="family-name" maxLength={80} required /></div>}<Field label="Telefon raqami" {...fieldProps('phone')} type="tel" autoComplete="tel" inputMode="tel" placeholder="+998 (__) ___-__-__" maxLength={22} required />{!recovery && <Field label="Parol" {...fieldProps('password')} type="password" autoComplete={signup ? 'new-password' : 'current-password'} maxLength={128} required />}{signup && <Field label="Parolni tasdiqlang" {...fieldProps('confirm')} type="password" autoComplete="new-password" maxLength={128} required />}</>}
      {error && <p className="field-error" role="alert">{error}</p>}
      <Button type="submit" className="auth-submit" busy={busy}>{step === 'verify' ? 'Tasdiqlash' : step === 'new-password' || changing ? 'Parolni saqlash' : signup ? 'Ro‘yxatdan o‘tish' : recovery ? 'SMS kod olish' : 'Kirish'}</Button>
      {step === 'verify' && <button type="button" className="auth-login-link" onClick={resend} disabled={Boolean(seconds) || busy}>{seconds ? `Qayta yuborish (${seconds} s)` : 'Kodni qayta yuborish'}</button>}
      {flow === 'login' && <div className="auth-links"><Link to="/royxatdan-otish">Ro‘yxatdan o‘tish</Link><Link to="/parolni-tiklash">Parolni unutdingizmi?</Link></div>}
      {flow !== 'login' && <Link className="auth-login-link" to={changing ? home : '/kirish'}>Orqaga qaytish</Link>}
    </form>}
    </main><Modal open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()} title="Formadan chiqasizmi?" actions={<><Button secondary onClick={() => blocker.reset?.()}>Qolish</Button><Button onClick={() => blocker.proceed?.()}>Chiqish</Button></>}><p>Kiritilgan ma’lumotlar saqlanmagan. Chiqsangiz, ularni qayta kiritish kerak bo‘ladi.</p></Modal></div>;
}
