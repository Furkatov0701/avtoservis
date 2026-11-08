# Avto — Supabase Auth ulash

> 2026-11-08: foydalanuvchi Telegram Mini App orqali kirishni tanladi.
> Bu hujjat oldingi telefon/SMS integratsiyasining texnik qaydi. SMS provayderini
> ulash endi navbatdagi ish emas. Joriy reja: [Telegram Mini App](telegram-mini-app-reja.md).
> Bajarilgan profil migratsiyasi saqlanadi, keyingi moslashtirish alohida migratsiya bo‘ladi.

2026-11-07 holati: Supabase loyihasi ochildi va foydalanuvchi public publishable
kalitni berdi. Rasmda ko'ringan Project URL:
`https://lewojwhdkbarktjhyrbi.supabase.co`. Public sozlamalar Git'dan chiqarilgan
`.env.local` fayliga saqlandi va format tekshiruvidan o'tdi. Preview rejimi
saqlangan, SMS hali o'chirilgan. Haqiqiy API ulanishi tasdiqlanmadi: bulut
proxy'si ushbu hostga CONNECT so'rovini 403 bilan blokladi. Aynan shu host uchun
network ruxsati environment draft'iga saqlandi; ko'rib chiqish, saqlash va
publish kutilmoqda. Draft saqlanishi ruxsat allaqachon ishlayotganini anglatmaydi.
Yangilanish — 2026-11-08: foydalanuvchi profil migratsiyasini Supabase SQL
Editor orqali bajardi va `Success. No rows returned` natijasini tasdiqladi.
Bu foydalanuvchi bildirgan natija; agent masofadagi sxema/RLSni hali mustaqil
tekshirmagan. SMS provayderi va haqiqiy akkaunt sinovlari hali kerak.
Hozir nashrdagi sayt UI namunasidir.

## 1. Loyiha ochish

1. https://supabase.com/dashboard orqali yangi loyiha yarating.
2. Loyiha tayyor bo'lgach, Connect / loyiha sozlamalaridan Project URL va
   `sb_publishable_…` public kalitini oling. Legacy `anon` kaliti ham qo'llanadi.
3. URL ochiq ma'lumot, uni chatga yuborish mumkin. Database paroli,
   `service_role`, `sb_secret_…` yoki SMS provayderi kalitini chatga yubormang.
4. `.env.example` nusxasini `.env.local` deb saqlang va public sozlamalarni
   kiriting. Bulut muhitida xuddi shu nomlarni Environment variables sifatida
   kiritish mumkin. `.env.local` Git'ga kirmaydi.

```dotenv
VITE_APP_MODE=live
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
VITE_PHONE_AUTH_ENABLED=false
```

`VITE_` qiymatlar brauzer buildiga kiradi. Bu yerda faqat public konfiguratsiya
bo'lishi kerak. Kod secret/service-role kalit bilan ishga tushishni rad etadi,
ammo maxfiy kalitni env'ga umuman joylashtirmaslik kerak.
Loyiha hosti ma'lum bo'lgach, bulutdan haqiqiy API tekshiruvi uchun aynan shu
hostga network ruxsati kerak; aynan loyiha hosti uchun draft tayyorlandi.

## 2. Profil migratsiyasi

Supabase SQL Editor'da `supabase/migrations/202611060001_profiles_and_roles.sql`
faylini bir marta bajaring. Migratsiya profil jadvali, avtomatik profil yaratish,
RLS va ustun bo'yicha ruxsatlarni yaratadi. Qayta bajarishga mo'ljallanmagan.

- Yangi akkaunt roli serverda doim `user`; foydalanuvchi metadata'sidagi `role`
  hech qachon vakolat manbai emas.
- Foydalanuvchi faqat o'z profilini o'qiydi, faqat ism/familiya ustunlarini
  yangilay oladi. Brauzerdan rol, ID, profil yaratish yoki o'chirish taqiqlangan.
- Parollar Supabase Auth'da boshqariladi, profil jadvalida parol yo'q.
- Ushbu bosqichda mijoz, avtomobil va xizmat jadvallari yaratilmaydi.

## 3. Telefon va SMS

Supabase Authentication sozlamalarida Phone provider va telefonni tasdiqlashni
yoqing. Parolning minimal uzunligini 8 belgi qilib sozlang. UI olti xonali SMS
kodini kutadi. OTP muddati va so'rov cheklovlari serverda ham sozlangan bo'lsin.

SMS provayderi hali tanlanmagan. Tanlashda O'zbekistonga yetkazib berish,
Supabase bilan integratsiya, narx va sender talablari tekshiriladi. Provayderning
maxfiy ma'lumotlari Supabase'ning server sozlamalariga kiritiladi; React env'ga
kiritilmaydi. Maxsus SMS hook kerak bo'lsa, u alohida server bosqichi bo'ladi.

Provayder va telefon tasdiqlash sozlangach, cheklangan test buildida
`VITE_PHONE_AUTH_ENABLED=true` qilib o'zingizning test raqamingizda yetkazishni
tekshiring. Ommaviy build uchun flag faqat haqiqiy testlar o'tgach yoqiladi.
`false` holatida ro'yxatdan o'tish va parolni tiklash mavjud emasligi ko'rsatiladi.
Bu flag UX boshqaruvi; serverdagi Phone/OTP siyosatini almashtirmaydi.

Oqimlar:

- Ro'yxat: ism + familiya + telefon + parol/tasdiq → SMS → user kabineti.
- Kirish: telefon + parol → tekshirilgan sessiya → DB profili → tegishli kabinet.
- Oldin tasdiqlanmagan telefon: kirishdan SMS'ni qayta yuborish va tasdiqlash.
- Tiklash: telefon → `signInWithOtp(shouldCreateUser: false)` → SMS → yangi
  parol/tasdiq. Bu jarayon yangi akkaunt yaratmaydi.
- Kirilgan holatda parolni almashtirish: hozirgi parol bilan qayta autentifikatsiya
  → yangi parol/tasdiq. Telefon raqamini almashtirish oqimi hali kelishilmagan.
- Chiqish shu qurilma sessiyasini tugatadi; boshqa qurilmalarni global chiqarish
  ushbu bosqichda kiritilmagan.

Parollar forma holatida vaqtincha turadi, log yoki localStorage'ga yozilmaydi.
Supabase SDK qayta ochilganda kirishni saqlash uchun sessiya tokenlarini lokal
saqlaydi. HashRouter bilan URL'dan avtomatik sessiya olish o'chirilgan.

## 4. Birinchi admin

Ochiq admin ro'yxatdan o'tish yo'q. Avval user sifatida SMS bilan tasdiqlangan
akkaunt yarating, so'ng Supabase Auth Users bo'limidan uning aniq UUID'sini oling.
Loyiha egasining ishonchli PostgreSQL ulanishidan quyidagini bajaring:

```sh
psql "$DATABASE_URL" -v admin_user_id='VERIFIED_AUTH_USER_UUID' -f supabase/bootstrap-admin.sql
```

`DATABASE_URL` faqat ishonchli terminal/server muhitida bo'ladi; React env'ga
kiritilmaydi. Script telefon tasdig'ini va admin hali yo'qligini tekshiradi,
parallel bajarishdan himoyalaydi. Bu faqat birinchi admin uchun. Keyingi
adminlarni tayinlash alohida tasdiqlangan boshqaruv jarayonini talab qiladi.
Rol o'zgargach, qayta kiring yoki sahifani yangilang.

## 5. Ishga tushirish va tekshirish

Node.js 22.12+ kerak. Konfiguratsiya o'zgargach Vite'ni qayta ishga
tushiring; statik hosting uchun qayta build zarur.

```sh
npm ci
npm test
npm run test:ui
npm run test:auth
npm run build
npm run dev
```

Playwright uchun Chromium kerak: muhitda `/usr/bin/chromium` bo'lsa ishlatiladi,
boshqa muhitda `npx playwright install chromium` bilan o'rnating.
`test:ui` preview rejimini, `test:auth` 5174-portdagi alohida live ilovani
tekshiradi. Auth testlari Supabase HTTP javoblarini taqlid qiladi; tashqi SMS
xizmatiga murojaat qilmaydi. `npm test` haqiqiy PostgreSQL dvigatelli PGlite'da
migratsiya/RLS ruxsatlari va birinchi admin scriptini tekshiradi. Testdagi Auth
sxemasi minimal bo'lib, Supabase xizmatining to'liq nusxasi emas.

Live rejimning kirish manzili `/app/#/kirish`. Config xato yoki yetishmasa,
ilova kirishni to'xtatadi. Demo ekranlar live rejimga aralashmaydi. Avtomobillar,
xizmatlar va profil tahriri keyingi bosqichlarda haqiqiy ma'lumotlar bilan ulanadi.
`VITE_APP_MODE=preview` mavjud namuna ekranlarini ochadi; bu autentifikatsiya emas.

Haqiqiy loyiha tayyor bo'lgach hali bajarilishi kerak:

- Ikki test akkaunt bilan ro'yxat, SMS yetkazilishi, noto'g'ri/muddati o'tgan kod,
  qayta yuborish, kirish, refresh, chiqish va parolni tiklash.
- Supabase REST orqali ikki akkauntning profil izolyatsiyasi va rol o'zgartirish
  taqiqlangani; real server sozlamalari lokal testlardan farq qilmasligi.
- Birinchi admin, user/admin yo'llari va haqiqiy profil yuklanish xatolari.
- Mobil ekranlarda yangi formalar va parol saqlanishi; SMS rate limitlari.

Haqiqiy tekshiruvlardan keyin alohida nashr qilinadi. Bu bosqichdagi kod hech
qanday Supabase loyihasini ochmaydi, migratsiyani masofadan bajarmaydi va saytni
automatik nashr qilmaydi.
