const messages = {
  invalid_credentials: 'Telefon raqami yoki parol noto‘g‘ri.',
  phone_not_confirmed: 'Telefon raqamingizni SMS kod orqali tasdiqlang.',
  otp_expired: 'Kod noto‘g‘ri yoki muddati tugagan. Yangi kod so‘rang.',
  otp_disabled: 'Telefonni tasdiqlash hozircha mavjud emas.',
  over_sms_send_rate_limit: 'SMS so‘rovlari ko‘payib ketdi. Biroz kutib qayta urining.',
  over_request_rate_limit: 'So‘rovlar ko‘payib ketdi. Biroz kutib qayta urining.',
  sms_send_failed: 'SMS yuborilmadi. Birozdan keyin qayta urining.',
  sms_provider_disabled: 'SMS xizmati hozircha mavjud emas.',
  user_already_exists: 'Bu raqam bilan akkaunt mavjud. Kirish yoki parolni tiklashdan foydalaning.',
  weak_password: 'Parol yetarlicha kuchli emas. Uzunroq, turli belgili parol tanlang.',
  same_password: 'Yangi parol avvalgisidan farq qilishi kerak.',
  reauthentication_needed: 'Amalni tasdiqlash uchun qayta kiring.',
  session_not_found: 'Sessiya tugagan. Qayta kiring.',
  refresh_token_not_found: 'Sessiya tugagan. Qayta kiring.',
  user_banned: 'Akkauntga kirish cheklangan. Administratorga murojaat qiling.',
};
export function authError(error) {
  if (error?.code && messages[error.code]) return messages[error.code];
  if (error?.status === 429) return messages.over_request_rate_limit;
  if (error?.status === 0 || error instanceof TypeError || /fetch|network/i.test(error?.message || '')) return 'Server bilan bog‘lanib bo‘lmadi. Internetni tekshirib, qayta urining.';
  return 'Amalni bajarib bo‘lmadi. Birozdan keyin qayta urining.';
}
