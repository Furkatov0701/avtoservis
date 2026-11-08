# Telegram Mini App — birinchi bosqichni ulash

> 2026-11-08: server uchun mavjud Supabase Edge Functions tanlandi.
> Joriy joylashtirish qadamlari: [Supabase bot deploy](supabase-telegram-deploy.md).
> Quyidagi Node server ko'rsatmalari lokal/alternativ transport sifatida saqlangan.

2026-11-08: Telegram ekran qobig'i va bot webhook serveri yozildi. Bu hali
akkauntga kirish emas. Serverda initData tekshiruvi, Telegram -> profil bog'lanishi,
Supabase sessiyasi va biznes ma'lumotlari keyingi bosqichga tegishli.

## Hozirgi natija

- `npm run dev:telegram` va `npm run build:telegram` alohida Telegram rejimi.
- Rasmga mos oq/bej/yashil uslub; Telegram viewport, safe area, ready/expand
  va BackButton qo'llanadi. Telegram URL hashidagi launch ma'lumotlariga ilova
  routeri tegmaydi; Telegram rejimida ichki navigatsiya xotirada yuritiladi.
- Oddiy brauzerda bot orqali ochish ko'rsatmasi; Telegram ichida kabinet
  tayyorlanayotgani ko'rsatiladi. User yoki admin huquqi berilmaydi.
- SDK yuklanmasa qayta urinish; SDK `https://telegram.org/js/telegram-web-app.js`
  orqali faqat Telegram rejimida yuklanadi. Oldingi preview va landing saqlanadi.
- `server/telegram` Node HTTP serveri faqat `GET /health` va
  `POST /telegram/webhook` yo'llarini beradi. `/start` va `/help`ga Mini App
  tugmali javob, faqat private chat uchun. Kutilmagan update'lar e'tiborsiz.
- Webhook uchun alohida secret header, JSON va 64 KiB body chegarasi. Token,
  foydalanuvchi xabari yoki initData logga yozilmaydi.
- Javob Telegram webhook response method ko'rinishida qaytariladi. Bu usulda
  Telegram yuborgan xabarning natijasini server tekshirmaydi; yetkazish kafolati
  va exactly-once da'vosi yo'q. DB yozuvi/notification queue ushbu bosqichda yo'q.

## Bot yaratish

Telegram'dagi rasmiy @BotFather'da `/newbot` yuboring. Nomi va `bot` bilan
tugaydigan username tanlang. Chatga faqat @username yuboriladi. Tokenni
hech qachon chatga yoki VITE_ o'zgaruvchisiga qo'ymang.

## Frontend konfiguratsiyasi

Foydalanuvchi bot nomini berdi: **@urgutservis_bot**. Public `.env.telegram`
faylida Telegram rejimi va shu username saqlandi. Boshqa test botiga
almashtirish kerak bo'lsa, Git'dan chiqarilgan `.env.telegram.local`ga yozing:

```dotenv
VITE_TELEGRAM_BOT_USERNAME=YOUR_BOT_USERNAME
```

```sh
npm run dev:telegram -- --port 5175
npm run build:telegram
```

Frontend `dist/`dan HTTPS hostingga chiqariladi, kirish nuqtasi `/app/`.
GitHub Pages faqat frontendni bera oladi. Telegram serveri alohida ishlashi kerak.
`npm run build` eski preview buildi; bot manziliga xato bilan preview buildini
chiqarmaslik kerak. Ikkala build ham bir xil `dist/`ga yozadi, oxirgi build
rejimini nashrdan oldin tekshiring. Production nashri hozir bajarilmagan.

## Server konfiguratsiyasi

Node.js 22.12+ kerak. `server/telegram/.env.example`dan nusxa olib rootda
`.env.server.local` yarating. Hostingda shu qiymatlar server environment/secret
sozlamalariga kiritiladi. Bot tokeni va webhook secret alohida qiymatlardir.

- `TELEGRAM_BOT_TOKEN`: BotFather bergan maxfiy token; botni sozlash scripti uchun.
- `TELEGRAM_WEBHOOK_SECRET`: 32–256 belgili tasodifiy secret; tokenning o'zi emas.
- `TELEGRAM_BOT_USERNAME`: token tegishli bo'lgan bot nomi, @ belgisiz.
- `TELEGRAM_MINI_APP_URL`: e'lon qilingan HTTPS frontend manzili, masalan `/app/` bilan.
- `TELEGRAM_WEBHOOK_URL`: e'lon qilingan HTTPS serverdagi `/telegram/webhook` yo'li.
- `PORT`: hosting bergan port; lokal odatiy qiymat 8787.

Webhook secretni ishonchli terminalda bir marta yaratish mumkin:

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Qiymatni secret sozlamasiga saqlang, chatga yubormang. Webhook serveri shu
secret bilan ishlaydi; joriy javob usulida bot tokenini ishlatmaydi. Keyingi
initData tekshiruvi uchun token faqat ishonchli serverda kerak bo'ladi.

```sh
npm run bot:serve
```

Hosting tashqariga 443-portda HTTPS beradi va so'rovni Node serveriga uzatadi.
Bepul hosting tanlovi hali yakunlanmagan. Kvota, sovuq ishga tushish/uyqu rejimi
va mavjudlik cheklovlari tanlovdan oldin tekshiriladi.

## Botni tashqi xizmatga ulash

Frontend va server haqiqiy HTTPS manzilida ishlagandan, server secretlari
kiritilgandan keyingina quyidagi amallar bajariladi:

```sh
npm run bot:check
npm run bot:configure
```

`bot:check` — getMe/getWebhookInfo orqali faqat o'qiydi. Tokenni yoki webhook
URL ichidagi sirni chiqarmaydi. `bot:configure` — `/start`, `/help`, Mini App
menyusi va webhookni Telegram'da o'rnatadi. Pending update'lar o'chirilmaydi.
Script bu bosqichda haqiqiy botga qarshi bajarilmagan: bot username berilgan, ammo token serverga hali kiritilmagan. Tokensiz ishga tushirish tarmoq so'rovisiz to'xtaydi.

Script `curl` ishlatadi; muhitning proxy va CA sozlamalari saqlanadi. Token
command argumentlariga emas, stdin konfiguratsiyasiga uzatiladi. Shell yoki
verbose trace ishlatilmaydi. Cloud'dan ishlatish uchun `api.telegram.org`,
SDK tekshiruvi uchun `telegram.org` ruxsati kerak. Supabase hosti ruxsatini ham
saqlash kerak. Joriy runtime ruxsat muammosi hal bo'lgan deb olinmagan.

BotFather'dagi Main Mini App sozlamasi orqali profilning Launch app tugmasini
ham qo'shish mumkin. Asosiy `/start` tugmasi va chat menyusi script orqali beriladi.

## Tekshiruv

```sh
npm test
npm run test:telegram
npm run test:ui
npm run test:auth
npm run build:telegram
```

Telegram brauzer testlari SDKni taqlid qiladi. HTTP test webhookni lokal
portda tekshiradi va Telegram'ga xabar yubormaydi. Haqiqiy bot bilan /start,
yordam, menu ochilishi va Android/iOS ko'rinishi bot/hosting tayyor bo'lgach
sinovdan o'tadi. Hech qanday server sessiyasi bu bosqichda yaratilmaydi.

## Keyingi bosqich

Telegram initData'ni serverda tekshirish, Telegram IDni profilga xavfsiz
bog'lash, Supabase bilan mos sessiya va birinchi admin oqimini qurish.
Mavjud profil migratsiyasini qayta bajarmaslik yoki o'chirmaslik kerak.

Tekshiruv natijasi: 12 ta Node, 5 ta Telegram brauzer, 7 ta UI va 7 ta eski
Auth testi (31 jami) o'tdi. Preview va Telegram production buildlari o'tdi.
Telegram rejimida /tmp screenshot orqali mobil ko'rinish ham tekshirildi.
