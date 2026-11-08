# AVTO SERVIS

## Yangi Avto kabineti — UI bosqichi

React + Tailwind + React Router mobil kabineti `/app/` manzilida ochiladi.
Ochiq UI namuna: https://furkatov0701.github.io/avtoservis/app/#/user/mashinalar
Ishga tushirish: `npm ci`, so‘ng `npm run dev`; serverdagi `/app/` sahifasiga o‘ting.
Desktopdagi yon panel yoki telefondagi “Ekran va holatni tanlash” orqali namuna
ekranlari va yuklanish/bo‘sh/xato/ruxsat holatlarini ko‘rish mumkin.

Bu UI namunasi: haqiqiy login, SMS, Supabase va serverga saqlash hali ulanmagan.
Formalar kirishni tekshiradi, ammo akkaunt yaratmaydi. Parollar va forma
qiymatlari localStorage yoki profil jadvaliga yozilmaydi.
Qo‘shimcha avtomobil/xizmat/profil formalarining haqiqiy oqimi keyingi bosqichlarda ulanadi.

- `src/cabinet/tokens.css` — markaziy dizayn qiymatlari.
- `src/cabinet/UI.jsx`, `Icon.jsx` — umumiy komponentlar va SVG ikonalar.
- `src/cabinet/demo.js` — alohida namuna ma’lumotlar.
- `docs/qarorlar.md` — tasdiqlangan va ochiq qarorlar, bosqich natijalari.
- `.env.example` — kelajakdagi Supabase uchun ochiq konfiguratsiya nomlari.

Tekshiruvlar: `npm test`, `npm run test:ui`, `npm run build`.
Brauzer testlari tizimdagi `/usr/bin/chromium`dan foydalanadi; u mavjud
bo‘lmagan kompyuterda avval `npx playwright install chromium` bajaring.
Build eski landing va yangi `dist/app/index.html`ni birga yaratadi.
HashRouter sabab statik hostingda ichki sahifani yangilash uchun rewrite talab qilinmaydi.

## Mavjud landing

O‘zbek tilidagi, mobil ekranlarga mos avtoservis landing sahifasi. Vite, oddiy JavaScript va Three.js asosida tayyorlangan.

## Ishga tushirish

Node.js 22.12+ kerak.

```sh
npm ci
npm run dev
```

## Production

```sh
npm run build
npm run preview
```

Tayyor statik sayt `dist/` papkasida hosil bo‘ladi. Uni statik hostingga joylashtirish mumkin.

GitHub Pages uchun `base: "./"` sozlangan, `.nojekyll` fayli build ichiga qo‘shiladi.
Tayyor sayt `gh-pages` tarmog‘iga yuborildi. Nashr manzili:
https://furkatov0701.github.io/avtoservis/

GitHub Pages manbasi: `gh-pages` tarmog‘ining ildiz papkasi (`/`).
Kelajakdagi o‘zgarishlarni chiqarishda saytni qayta yig‘ib, `dist/` tarkibini shu tarmoqqa yuborish kerak.

## Imkoniyatlar

- Tashqi model fayllarisiz yaratilgan interaktiv 3D avtomobil; sichqoncha va sensorli ekran orqali aylantirish.
- WebGL mavjud bo‘lmasa, avtomobilning SVG ko‘rinishi.
- Lokal shriftlar: tashqi font yoki rasm xizmatlariga bog‘liqlik yo‘q.
- Oltita xizmat kartasi, batafsil modal oynalar, FAQ va mobil menyu.
- Tekshiriladigan qabul formasi va matn fayli sifatida yuklab olinadigan tashrif arizasi.
- Harakatni kamaytirish sozlamasi va klaviatura orqali boshqarish.

## Qabul formasi

Forma ma’lumotni serverga yubormaydi va qabulni avtomatik tasdiqlamaydi. Ariza faqat brauzer xotirasida tayyorlanib, foydalanuvchi xohlaganda `.txt` fayl sifatida yuklab olinadi. Shaxsiy ma’lumotlar localStorage yoki cookie’larda saqlanmaydi.

Haqiqiy arizalarni qabul qilish uchun servisning backend yoki CRM tizimini ulash, shuningdek haqiqiy telefon, manzil va ish vaqtini kiritish kerak. API kalitlarini brauzer kodiga joylashtirmang.

## Fayllar

- `src/main.js` — sahifa mazmuni, menyu, modal oynalar va ariza formasi.
- `src/car-scene.js` — 3D model, yoritish va boshqaruv.
- `src/style.css` — dizayn va mobil ekranlar uchun moslashuv.

`npm run build` production yig‘ilishini tekshiradi. Brauzerda 3D model, xizmat oynalari, FAQ, forma tekshiruvlari, ariza yuklash va mobil menyuni tekshiring.


## Avto kabineti va Auth

`/app/` — React kabineti. Standart `preview` rejimda dizayn namunasi ochiladi.
Yangi `live` rejim Supabase orqali kirish, user ro'yxati, telefon tasdiqlash,
parol tiklash/almashtirish va serverdan olingan rollarni qo'llaydi.

Loyiha va SMS provayderi hali sozlanmagan. To'liq qadamlar va env nomlari:
[Auth ulash](docs/auth-setup.md). Maxfiy server kalitlari brauzerga kiritilmaydi.

`npm test` — validatsiya, auth qoidalari va lokal PostgreSQL RLS testi.
`npm run test:ui` — mavjud dizayn va navigatsiya regressiyasi.
`npm run test:auth` — test API javoblari bilan auth brauzer testlari.


## Telegram Mini App poydevori

`npm run dev:telegram` Telegram rejimini ochadi; `npm run build:telegram` shu
rejimni yig'adi. Bu hozir tayyorlanayotgan kabinet qobig'i, haqiqiy login emas.
`npm run bot:serve` webhook serverini ishga tushiradi. Bot tokeni frontendga
kiritilmaydi. Sozlash va tekshirish: [Telegram yo'riqnomasi](docs/telegram-setup.md).

`npm run test:telegram` — SDK taqlidi bilan Telegram ekranlari testi.
