export function normalizePhone(value) {
  const digits = value.replace(/\D/g, '');
  if (/^\d{9}$/.test(digits)) return `+998${digits}`;
  if (/^998\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}
export function validateAuth(values, registering = false) {
  const errors = {};
  if (registering && (values.firstName || '').trim().length < 2) errors.firstName = 'Ismingizni kamida 2 harf bilan kiriting.';
  if (registering && (values.lastName || '').trim().length < 2) errors.lastName = 'Familiyangizni kamida 2 harf bilan kiriting.';
  if (!normalizePhone(values.phone || '')) errors.phone = 'Raqamni +998 va 9 ta raqam bilan kiriting.';
  if (!(values.password || '')) errors.password = 'Parolingizni kiriting.';
  else if (registering && values.password.length < 8) errors.password = 'Parol kamida 8 ta belgidan iborat bo‘lsin.';
  if (registering && values.confirm !== values.password) errors.confirm = 'Parollar bir xil emas.';
  return errors;
}
