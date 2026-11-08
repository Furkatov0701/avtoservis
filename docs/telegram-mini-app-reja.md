# Avto — Telegram Mini App tekshiruvi va ishlar ketma-ketligi

Sana: 2026-11-08. Foydalanuvchi Telegram bot orqali ochiladigan Mini App
va Telegram akkaunti orqali kirishni tasdiqladi. Bu qaror SMS, email/parol va
ilova parolini tiklashni asosiy kirish oqimi sifatida rejalashtirishni almashtiradi.
Ushbu ishda kod o'qildi, mavjud testlar bajarildi va reja yozildi. Telegram
auth integratsiyasi hali amalga oshirilmadi; mavjud ma'lumotlar yoki migratsiya o'chirilmadi.

Yangilanish: 1-bosqichning lokal kodi yozildi — SDK qobig'i, bot webhooki va
sozlash scripti. Bot/HTTPS hosting bilan haqiqiy ulash hali qolgan. Tafsilot:
[Telegram sozlash](telegram-setup.md). Quyidagi jadval boshlang'ich audit holatidir.

## Tekshirilgan holat

| Qism | Dalil va holat |
| --- | --- |
| Dizayn va mobil navigatsiya | React/Tailwind, oq-bej-yashil tokenlar, SVG ikonalar, adminning 5 va userning 3 menyusi tayyor. `src/cabinet/Pages.jsx`, `UI.jsx`, `styles.css`. |
| Namuna ekranlar | Mijoz qidirish, avtomobil tanlash, xizmat kartalari va tarix ko'rinishi ishlaydi, lekin ma'lumotlar `demo.js`dan. Qo'shish/tahrirlash amallari ko'pincha izoh oynasi ochadi. |
| Real rejim | `auth/live.jsx`da login/profil/parol bor; mijoz, avtomobil va xizmat bo'limlari keyingi bosqich haqida matn chiqaradi. `.env.local` hozir `preview`, SMS flag `false`. |
| Eski Auth | Supabase phone/password/OTP kodi va testlari yozilgan. `session.js` telefon tasdig'ini talab qiladi, admin bootstrap ham `phone_confirmed_at`ga bog'liq. Telegram uchun mos emas. |
| Profil bazasi | Bitta migratsiya: `profiles`, RLS, profil yaratish va timestamp triggerlari. Foydalanuvchi SQL Editor'da Success natijasini bildirdi; masofadagi holat agent tomonidan mustaqil tasdiqlanmagan. |
| Biznes bazasi | Alohida mijozlar, avtomobillar, xizmat yozuvlari va tarix uchun migratsiya/API yo'q. Profil RLS barcha kelajakdagi jadvallar uchun himoya hisoblanmaydi. |
| Telegram | SDK integratsiyasi, serverda initData tekshirish, Telegram identity mapping, bot handler/webhook va Mini App sozlash kodi yo'q. Bot yaratilganiga dalil yo'q. |
| Server | Hozir Vite statik frontend. Telegram tekshiruvi va bot uchun server/Edge Function hali yo'q. GitHub Pages server kodini ishlatmaydi. |
| Git va nashr | Mahalliy HEAD `113e3be`; yangi manba fayllari untracked. Oldingi UI namunasining gh-pages nashri qaydlarda mavjud. Joriy manba kodini Git'ga kiritish va nashr oqimini tayyorlash kerak. |
| Tarmoq | Runtime holati joriy, policy enforced, custom allowed hosts bo'sh. Supabase hosti saqlangan draftda bor, amaldagi muhitga qo'llanmagan. Yangi HTTP tekshiruvi qilinmadi; oldingi urinish 403 bilan bloklangan. |

## Hozir qayta bajarilgan tekshiruvlar

- `npm test` o'tdi; test izolyatsiyasiz yugurtirilganda 7 individual test o'tdi.
- `npm run test:ui`: 7 test o'tdi.
- `npm run test:auth`: 7 test o'tdi; Supabase HTTP javoblari taqlid qilingan.
- `npm run build`: preview production build o'tdi.
- Jami 21 individual test mavjud; ular Telegram kirishi yoki real Supabase
  integratsiyasi ishlashini isbotlamaydi. RLS testi minimal Auth sxemali lokal
  PGlite PostgreSQL'da bajariladi. Ushbu tekshiruvda yangi test yozilmadi.

## 1. Telegram poydevori, server va kodni saqlash

- Manba fayllarini Git commit/branch orqali versiyalash; `.env.local`, tokenlar,
  node_modules, dist va test artefaktlarini manba commitiga qo'shmaslik.
- Bot mavjudligini aniqlash; mavjud bo'lmasa BotFather orqali yaratish.
  Bot tokeni chatga yoki frontendga emas, server secret sozlamasiga kiritiladi.
- Frontend uchun HTTPS va server/Edge Function joylashuvini tanlash. Supabase
  hamda kerak bo'lsa Telegram API uchun aniq host ruxsatlarini qo'llash masalasini
  hal qilish; tashqi kirish to'sig'i lokal kod/testlarni to'xtatmaydi.
- Botda `/start`, «Kabinetni ochish», yordam amallari; Mini App URL va menyu.
- Telegram SDK bilan ready/viewport/safe area/back-button hayot siklini ulash;
  Telegram tashqarisida tushunarli kirish ko'rsatmasi. Tasdiqlangan ranglar saqlanadi.

Tayyorlik: botdan HTTPS Mini App ochiladi, Android/iOS ekraniga sig'adi;
secret frontend buildida yo'q. Bu hali foydalanuvchi autentifikatsiyasi emas.

## 2. Telegram orqali xavfsiz kirish va profil moslashtirish

- Telegram `initData`ni serverda rasmiy tekshiruv usuli bilan tekshirish;
  auth_date, imzo, botga moslik va sessiya muddati nazorati. `initDataUnsafe`
  yoki brauzerdan yuborilgan ID/role mustaqil ishonch manbai bo'lmaydi.
- Barqaror Telegram user ID -> ichki user UUID bog'lanishini unique qilish;
  qayta kirishda yangi profil ochilib ketmasin. Username/telefon egani belgilamaydi.
- Supabase bilan sessiya integratsiyasi uchun texnik qarorni kichik prototipda
  tasdiqlash: hozirgi `profiles.id -> auth.users.id` va `auth.uid()`ga mos server
  sessiyasi/identity bog'lanishi, yoki boshqariladigan backend API. Telegram
  initData o'z-o'zidan Supabase access token emas. API vakolati va DB siyosati
  birgalikda isbotlanmasdan frontendni real ma'lumotlarga ulamaslik.
- Yangi, alohida migratsiya bilan mavjud profil va ma'lumotlarni saqlab moslashtirish.
  Oldingi bajarilgan SQL faylini qayta yozish/ishga tushirish orqali almashtirmaslik.
- Telefon tasdig'iga bog'langan guard va ilk admin scriptini yangi ishonchli
  identity oqimiga moslashtirish. Admin foydalanuvchi tanlaydigan rol emas.
- Mini App'da alohida login/parol/OTP/tiklash ekranlarini yangi kirish holatlari
  bilan almashtirish; eski kodni o'tish tekshirilgach tozalash. Email/SMS zaxira
  oqimini o'zimizcha qo'shmaslik.
- Telefonni faqat mijoz roziligi bilan olish. Contact so'rovi rad etilgan holatni
  ishlash; kiritilgan telefonni avtomatik tasdiqlangan deb hisoblamaslik.

Tayyorlik: ikki haqiqiy Telegram akkaunti alohida profil ochadi; qayta kirishda
profil saqlanadi; qalbakilashtirilgan/eskirgan initData rad etiladi; user admin
bo'la olmaydi. Telegram akkauntini tiklashni bot bajarmaydi.

## 3. Biznes qoidalari va ma'lumotlar bazasi

- Jadvallardan oldin ochiq qoidalarni aniqlashtirish: bitta/ko'p servis,
  bir mijozga bir nechta mashina, xizmatdagi ikki sana, g'ildiraklarning to'rtta
  joylashuvi. Oldingi tasdiqlangan menyu va user vakolatlarini qayta so'ramaslik.
- Mijoz, avtomobil, xizmat turlari va xizmat yozuvlari bog'lanishlarini yaratish;
  tarix yozuvlari, kerakli maydonlar, sana/km validatsiyasi va indekslar.
- Har bir jadval/API uchun serverda admin/user vakolati va egaga bog'lanish.
- O'chirish/arxivlash, mashinani boshqa egaga o'tkazish va userning mavjud
  mashinasini tahrirlashi hali ochiq: tasdiqsiz qo'shilmaydi.

Tayyorlik: ikki akkaunt bilan izolyatsiya testlari; begona mijoz/avtomobilga yozish
va user tomonidan xizmat yozish rad etiladi. Real Supabase'da ham tekshiriladi.

## 4. Profil va mijozlar

- User o'z ism-familiyasi va kelishilgan profil maydonlarini tahrirlaydi.
- Admin mijozni qo'shadi, qidiradi, tafsiloti va avtomobillarini ochadi.
- Admin oldindan yaratgan mijozni haqiqiy Telegram akkauntiga biriktirish
  uchun xavfsiz taklif/tasdiqlash oqimi. Faqat bir xil telefon yoki username
  topilgani uchun akkauntlarni avtomatik birlashtirmaslik.
- Mijoz formasi va tafsilot tuzilishini kelishilgan dizayn uslubida tayyorlash.

Tayyorlik: yozuv bazada saqlanadi va qayta ochilganda ko'rinadi; admin mijoz
uchun parol kiritmaydi; user faqat o'z profilini o'zgartiradi.

## 5. Avtomobillar

- User o'ziga mashina qo'shadi; admin tanlangan mijozga mashina qo'shadi.
- Model, davlat raqami va kelishilgan maydonlar; dublikat va egalik nazorati.
- Mashina tanlanganda keyingi xizmat ekranlari o'sha mashinaga bog'lanadi.
- Mashina yo'q, qidiruv natijasiz, yuklanish, saqlash xatosi va qayta urinish.

Tayyorlik: yangi mashina qayta kirganda ham mavjud; begona mashinani URL yoki
so'rovdagi ID orqali olish/biriktirish mumkin emas.

## 6. To'rtta xizmat va haqiqiy admin/user ekranlari

- Balonlar, motor moyi, tonirovka, antifriz kartalarini real yozuvlarga ulash.
- Admin xizmat qo'shadi/tahrirlaydi; user o'z mashinasining so'nggi xizmati
  va tarixini ko'radi. Sana, km va g'ildirak maydonlari 3-bosqich qaroriga mos.
- Tarix saqlanishi, tahrir izini yuritish va takroriy yuborishni boshqarish.
- Demo ma'lumotlarni real rejimdan chiqarish; admin bosh sahifasi va aksiyaga
  haqiqiy kontent berilmagan bo'lsa, bo'sh holat ko'rsatish. Uydirma mijoz/statistika
  yoki aksiyani haqiqiy deb chiqarmaslik.

Tayyorlik: adminning yozuvi tegishli mijozda ko'rinadi, boshqa mijozda ko'rinmaydi;
user xizmatni API orqali ham o'zgartira olmaydi.

## 7. To'liq sinov va birinchi ishchi nashr

- Telegram Android/iOS/Desktop: ichki navigatsiya, klaviatura, safe area,
  qayta ochish, sessiya tugashi va sekin internetdagi holatlar.
- Admin + kamida ikki mijoz: kirish -> profil -> mashina -> xizmat -> tarix.
- Haqiqiy Supabase ruxsatlari, bot/API xatolari, zaxiralash/tiklash va xatolarni
  kuzatish. Qulaylik uchun Telegram tasdiqlashini chetlab o'tmaslik.
- HTTPS frontend/server, bot webhook/menu, secretlar va limitlarni yakunlash;
  manba kodidan qayta build/deploy qilish va oldingi nashrga qaytish imkoniyati.
- Bepul tariflarda boshlash; kvota, uyqu rejimi va server resurslari borligini
  qayd etish. Cheksiz va doimiy bepul hosting va'da qilinmaydi.

Tayyorlik: haqiqiy mijoz o'z mashinasini qo'shib, admin yozgan xizmatni Telegram
ichida ko'radi. Ishchi nashr va demo manzili farqi aniq bo'ladi.

## Birinchi nashrdan keyingi qo'shimchalar

Botdagi avtomatik xizmat eslatmalari foydali keyingi imkoniyat. Jo'natish vaqti,
rozilik, to'xtatish, takror yuborishni cheklash va yetkazish xatolari alohida
kelishiladi; hozirgi asosiy nashrni shu funksiya kutib turmaydi. Ilova paroli
yo'q bo'lgani uchun «parolni botda tiklash» yangi vazifa emas.
