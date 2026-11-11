# AVTO SERVIS

O‘zbek tilidagi avtoservis loyihasi: ommaviy 3D landing sahifa, Telegram Mini App kabineti, Supabase Edge Function va Telegram botdan iborat.

## Nashr qilingan manzillar

- Landing: https://furkatov0701.github.io/avtoservis/
- Telegram Mini App: https://furkatov0701.github.io/avtoservis/app/
- Telegram bot: `@urgutservis_bot`

`main` boshlang‘ich landing manbasini, `work` esa kabinet va botning faol manba kodini saqlaydi. GitHub Pages buildi `gh-pages` tarmog‘ida.

## Loyihaning bosqichlari

1. **Landing** — Vite, oddiy JavaScript va Three.js asosidagi responsiv avtoservis landing yaratildi. Unda 3D avtomobil, xizmatlar, FAQ va qabul formasi bor. Forma serverga yubormaydi.
2. **Mobil kabinet dizayni** — rasmda tasdiqlangan oq/bej/to‘q-yashil uslubda React, React Router va Tailwind asosidagi `/app/` kabinet yaratildi. Landing alohida saqlandi.
3. **Dastlabki auth maketi** — SMS/parol oqimlari, Supabase profil/RLS konsepti va brauzer testlari yozildi. Keyin asosiy kirish usuli Telegram Mini App etib o‘zgartirildi; Telegram rejimi authdan ustun.
4. **Telegram bot va Mini App** — `@urgutservis_bot`, Telegram WebApp SDK, viewport/safe area, BackButton, `/start`, `/help` va “Kabinetni ochish” tugmasi qo‘shildi.
5. **Supabase Edge Function** — Telegram `initData` imzosini serverda tekshirish, webhook, bot sozlamasini alohida setup secret bilan himoyalash, bot tokenini hech qachon frontendga chiqarmaslik amalga oshirildi.
6. **Ma’lumotlar modeli va admin** — Telegram profillari, mijozlar, avtomobillar, xodim rollari va xizmat yozuvlari uchun Supabase migratsiyalari yaratildi. Admin mijoz, avtomobil va xizmat yozuvlarini boshqaradi.
7. **User kabineti va mobil navigatsiya** — user faqat o‘z avtomobillari va xizmat tarixini ko‘radi. Admin/user uchun alohida pastki menyu, mijoz qidiruvi, xizmat kategoriyasi kartalari va ko‘rinadigan orqaga qaytish tugmasi qo‘shildi.

## Hozir ishlaydigan imkoniyatlar

### Telegram bot

- `/start` va `/help` buyruqlari.
- Mini App’ni ochuvchi tugma va chat menyusi.
- Telegram webhook siri HMAC orqali token va funksiya URLidan hosil bo‘ladi.
- Faqat private chatdagi haqiqiy buyruqlar qabul qilinadi.

### Telegram Mini App

Dizayn: **Petrol Teal + Sand** (A variant joylashuvi). Fon — qumrang `#f7f3eb`, asosiy rang — petrol teal `#1b5058`, urg‘u — qum `#d9b886`. Muddat ranglari: yashil (vaqt bor), oxra (14 kun va kamroq qoldi), terrakota (o‘tdi). Manrope shrifti, yozuvli 5 ta pastki menyu, yuqorida ← / Admin·User / ism harflari avatari.

- Har bir xizmatda progress chiziq, “N kun qoldi / N kun kechikdi” va rangli belgi.
- Mijoz bosh sahifasi: mashina kartasi (km · yil · raqam), muddati o‘tgan xizmat ogohlantirishi, yaqin xizmatlar.
- Admin bosh sahifasi: aksiya, statistika (mijozlar / bu hafta / o‘tgan) va “Qo‘ng‘iroq qilish kerak” ro‘yxati (`admin-overview`).
- Balonlar mashina sxemasida, har bir g‘ildirak o‘z holati bilan; xizmat sahifasida keyingi sana kartasi va tarix.

- Kirish faqat Telegram orqali, parol yo‘q. Telegram ichida `initData` serverda tekshiriladi; frontenddagi user metadata hech qachon rol bermaydi.
- **Mijozni bog‘lash:** admin mijozni ism, familiya va telefon bilan qo‘shadi. Mijoz Mini App’ni birinchi ochganda «Akkaunt yaratish» ekranida telefonini Telegram orqali ulashadi; bot webhook’i kontakt aynan shu foydalanuvchiniki ekanini (`contact.user_id === from.id`) tekshirib, kartani bog‘laydi. Mos karta bo‘lmasa yangi mijoz kartasi yaratiladi. Boshqa akkauntga bog‘langan kartani hech kim egallay olmaydi.
- Admin menyusi: Bosh (aksiya), Mashinalar, Mijozlar, Bo‘limlar, Sozlamalar.
- User menyusi: Bosh (yaqin xizmat sanalari), Mashinalar, Profil, Bo‘limlar, Sozlamalar. Mijozlar ro‘yxati faqat adminga ko‘rinadi.
- Mijozlar: raqamlangan jadval, «Ko‘rish», «Yana....», qidiruv, yashil «+» → Mijoz qo‘shish.
- Mashinalar: 2 ustunli kartalar, `30 │ UUU111 │ UZ` raqam belgisi; admin uchun yashil «+» → Mashina qo‘shish.
- Bo‘limlar: har bir xizmat keyingi sana, progress va holat bilan.
- Xizmat ekrani: dropdown, keyingi sana kartasi, «MAY 1 - NOYABR 10» ko‘rinishidagi tarix; Balonlar uchun 4 g‘ildirakning alohida sanasi. Admin «Yozuv qo‘shish» orqali yozuv kiritadi.
- Profil: ism, mashina va raqam, telefon, Tahrirlash (ism/familiya; telefon faqat Telegram kontakti orqali yangilanadi), Chiqish (Mini App’ni yopadi).

### Supabase

Migratsiyalar quyidagi jadvallarni yaratadi:

- `telegram_profiles`
- `service_staff` — admin roli faqat shu jadval orqali belgilanadi
- `customers`
- `vehicles`
- `service_records` — `tire_positions` ustunida har bir g‘ildirakning keyingi sanasi

`202611110001_customer_phone_link.sql` mijozlarga faqat o‘qiladigan `phone_normalized` ustunini qo‘shadi (turli formatda yozilgan raqamlarni moslash uchun). Mavjud ma’lumot o‘zgartirilmaydi.

Jadvallar RLS bilan yoqilgan. Brauzer ular bilan bevosita ishlamaydi; Edge Function serverdagi `SUPABASE_SERVICE_ROLE_KEY` orqali, Telegram identifikatsiyasi tekshirilgandan keyin murojaat qiladi.

## Supabase Edge Function’ni yangilash

Manba fayli: `supabase/functions/_shared/telegram-edge.js`.

Dashboard editoriga qo‘yiladigan yagona faylni yaratish:

```sh
npm run build:edge
```

Hosil bo‘lgan `supabase/dashboard/telegram-bot.ts` faylining **to‘liq** mazmunini Supabase’dagi `telegram-bot` Function Editor’ga qo‘yib Deploy bosing.
Function uchun JWT tekshiruvi o‘chiriladi, chunki Telegram Supabase JWT yubormaydi; webhook va setup alohida secretlar bilan himoyalangan.

Kerakli Supabase Secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_SETUP_SECRET`
- `TELEGRAM_BOT_USERNAME=urgutservis_bot`
- `TELEGRAM_MINI_APP_URL=https://furkatov0701.github.io/avtoservis/app/`
- `SUPABASE_SERVICE_ROLE_KEY`

Secretlarni kodga, `.env.telegram`ga, buildga yoki chatga yozmang.

## Lokal ishga tushirish

Node.js 22.12+ kerak.

```sh
npm ci
npm run dev
```

Telegram rejimi:

```sh
npm run dev:telegram
npm run build:telegram
```

Oddiy `npm run build` preview kabinetni, `npm run build:telegram` esa real Telegram Mini App buildini hosil qiladi. Nashrga doim Telegram build yuboriladi.

## Tekshiruvlar

```sh
npm test
npm run test:ui
npm run test:auth
npm run test:telegram
npm run build
npm run build:telegram
npm run check:edge
```

Testlar Telegram initData tekshiruvi, Edge Function xavfsizligi, admin ruxsatlari, RLS qoidalari, mobil viewport, navigatsiya hamda UI regressiyalarini qamrab oladi.

## Asosiy fayllar

- `src/main.js`, `src/car-scene.js`, `src/style.css` — landing.
- `src/cabinet/telegram/main.jsx` — Telegram Mini App ekranlari.
- `src/cabinet/telegram/api.js` — Edge Function’ga xavfsiz so‘rovlar.
- `src/cabinet/telegram/sdk.js` — Telegram WebApp SDK integratsiyasi.
- `src/cabinet/telegram/telegram.css` — mobil kabinet uslublari.
- `supabase/migrations/` — Supabase sxemasi va RLS.
- `supabase/functions/_shared/telegram-edge.js` — Edge Function manbasi.
- `supabase/dashboard/telegram-bot.ts` — dashboardga qo‘yiladigan yig‘ilgan fayl.
- `docs/qarorlar.md` — biznes/dizayn qarorlari tarixi.
- `docs/dizayn/` — tasdiqlangan dizayn tizimi: ranglar, qoidalar va barcha ekranlar.
- `docs/supabase-telegram-deploy.md` — Supabase deploy yo‘riqnomasi.

## Yangilanishni ishga tushirish tartibi (2026-11-11)

1. Supabase → SQL Editor’da `supabase/migrations/202611110001_customer_phone_link.sql`ni bajaring. **Bu birinchi bo‘lishi shart**: yangi Edge Function shu ustunga tayanadi.
2. `supabase/dashboard/telegram-bot.ts`ni `telegram-bot` funksiyasiga qo‘yib Deploy qiling.
3. `npm run build:telegram` buildini GitHub Pages’ga nashr qiling.

## Qolgan rivojlantirish ishlari

- Xizmat yozuvini tahrirlash va arxivlash.
- Keyingi xizmat sanasi bo‘yicha Telegram eslatmalari.
- Admin uchun mijoz kartasini tahrirlash.
