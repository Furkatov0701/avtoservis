# Avto botini Supabase Edge Functions'ga joylashtirish

2026-11-08. Foydalanuvchi tokenni almashtirish ko'rsatmasidan keyin Supabase
Secrets'ga saqlaganini bildirdi. Agent tokenni o'qimadi, ishlatmadi yoki uning
haqiqiyligini tekshirmadi. Haqiqiy deploy va Telegram ulanishi hali bajarilmadi.
Ushbu loyiha uchun server joyi — mavjud Supabase loyihasidagi Edge Functions.

## 1. Tayyor funksiyani joylashtirish

Supabase -> Edge Functions -> Deploy a new function -> Via Editor:

1. Funksiya nomi: `telegram-bot` (aynan shu nom).
2. Editordagi namuna kodni butunlay almashtiring:
   `supabase/dashboard/telegram-bot.ts` faylining to'liq mazmunini qo'ying.
3. Deploy bosing.
4. Shu funksiyaning sozlamalarida JWT tekshiruvini (`Verify JWT` yoki
   `Enforce JWT verification`) o'chiring. Bu faqat shu webhook funksiyasi uchun;
   umumiy Supabase Auth, telefon confirmation yoki bazadagi RLS o'zgartirilmaydi.

Telegram Supabase JWT yubormaydi. Har bir webhook POST alohida maxfiy header
bilan tekshiriladi. Sozlash POST'i esa boshqa setup secretni talab qiladi.
GET sog'liq tekshiruvi maxfiy ma'lumot yoki Telegram API natijasini bermaydi.

Funksiya manzili:

`https://lewojwhdkbarktjhyrbi.supabase.co/functions/v1/telegram-bot`

Brauzerda shu URL'ni ochish orqali HTTP 200 va `status: ok` ko'rinishi kerak.
Bu faqat server konfiguratsiyasi formati yuklanganini ko'rsatadi; tokenning
Telegram'da ishlashi yoki bot ulanganini hali tasdiqlamaydi. Setup secret
kiritilmagan bo'lsa `setupEnabled: false` bo'lishi odatiy holat.

`supabase/dashboard/telegram-bot.ts` avtomatik yig'iladigan bitta fayl; import
va npm paketi talab qilmaydi. Manba: `supabase/functions/_shared/`. Manba
 o'zgarsa `npm run build:edge`, mosligini tekshirish uchun `npm run check:edge`.

CLI bilan deploy qiladigan ishonchli operator uchun:

```sh
supabase functions deploy telegram-bot --project-ref lewojwhdkbarktjhyrbi --no-verify-jwt
```

CLI operatorning Supabase autentifikatsiyasini talab qiladi. Faqat public
publishable kalit bilan deploy qilish yoki Secrets'ni o'qish mumkin emas.
Token/parol/access tokenni chatga yuborish talab qilinmaydi.

## 2. Secrets

Supabase -> Edge Functions -> Secrets:

| Nom | Qiymat / vazifa |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Yangi BotFather tokeni; foydalanuvchi saqlaganini bildirdi. |
| `TELEGRAM_SETUP_SECRET` | Alohida, tasodifiy 32–256 belgili sozlash siri; parol generatoridan oling. Token bilan bir xil bo'lmasin. |
| `TELEGRAM_BOT_USERNAME` | Ixtiyoriy: `urgutservis_bot`. Kodning standart qiymati ham shu. |
| `TELEGRAM_MINI_APP_URL` | Keyin: Telegram rejimidagi haqiqiy HTTPS frontend URL. Hozircha bo'sh qoldirilishi mumkin. |

`SUPABASE_URL` Edge runtime tomonidan beriladi; uni qo'lda token bilan
almashtirmang. `TELEGRAM_SETUP_SECRET` bot sozlamalarini o'zgartirishni himoya
qiladi. Uni ham chatga, frontendga yoki skrinshotga chiqarmang. Xizmatlar
uchun kerak bo'ladigan user/admin sessiyasi bilan bu secretning aloqasi yo'q.

Webhook siri token va funksiya manzilidan HMAC orqali serverda hosil qilinadi;
uni qo'lda nusxalash shart emas. Bot tokeni o'zgarganda `configure`ni qayta
bajarish kerak — eski webhook siri yangi token bilan qabul qilinmaydi.

## 3. Tokenni tekshirish

Funksiyaning Test/Invoke oynasida POST so'rov yuboring. Shu projectning
Supabase dashboardi ichida quyidagi header va body ishlatiladi:

```text
Content-Type: application/json
x-avto-setup-secret: <o'zingiz Secrets'ga saqlagan setup siri>
```

```json
{"action":"check"}
```

Headerga bot tokeni qo'yilmaydi. Setup sirini faqat o'zingiz boshqaradigan
Supabase funksiyasiga yuboring; test oynasidagi qiymatni skrinshotga olmang.
`check` faqat Telegram getMe/getWebhookInfo so'rovlarini yuboradi. Natijada
`ok: true`, `bot: @urgutservis_bot` chiqishi kerak. `webhookMatches: false`
sozlash hali bajarilmaganda odatiy. Xatoda tokenni chatga yubormang; faqat
`error` va `stage` qiymatlarini bildiring.

## 4. Botni ulash

Xuddi shu POST header bilan body'ni quyidagiga almashtiring:

```json
{"action":"configure"}
```

Bu amalda Telegram'dagi bot komandalarini va webhook manzilini o'rnatadi.
Xizmat avval token aynan @urgutservis_bot'ga tegishli ekanini getMe orqali
tekshiradi. Telegram'dagi pending update'lar o'chirilmaydi. Qisman xatoda
oldingi amallar bajarilgan bo'lishi mumkin; bir xil server sozlamasi bilan
qayta bajarish mumkin. Bir vaqtning o'zida bir necha configure so'rovi yubormang.

- Frontend URL yo'q bo'lsa, `/start` faqat kabinet tayyorlanayotganini aytadi.
  Demo yoki uydirma mijoz kabinetiga tugma chiqarilmaydi.
- Telegram-mode frontend HTTPS'da nashr qilingach, uning URL'ini
  `TELEGRAM_MINI_APP_URL`ga kiriting va configure'ni yana bajaring.
  Shunda «Kabinetni ochish» tugmasi va chat menyusi paydo bo'ladi.
- Joriy GitHub Pages `/app/` manzili oldingi preview bo'lishi mumkin; Telegram
  build nashri tekshirilmaguncha uni tayyor Mini App deb belgilamang.

Sozlashdan keyin `check`da `webhookMatches: true`, Telegram'da haqiqiy
`/start` va `/help` javoblari tekshiriladi. `configure`ning muvaffaqiyati xabar
haqiqatan yetib kelgani yoki Mini App autentifikatsiyasi tayyorligini anglatmaydi.
Ish tugagach setup sirini o'chirish/almashtirish boshqaruv kirishini yopadi;
webhook alohida siri bilan ishlashda davom etadi.

## Tekshiruv doirasi va cheklovlar

- Node Web APIs orqali Edge handler, webhook maxfiyligi, setup ruxsati,
  botga moslik, Telegram xatolari, JSON chegaralari va generatsiya qilingan
  dashboard faylining Deno adapteri stub bilan sinovdan o'tkazildi.
- Telegram javoblari testda taqlid qilingan. Haqiqiy tarmoq so'rovi, deploy,
  yangi tokenning haqiqiyligi va Supabase Edge runtime hali tekshirilmagan.
- Webhook javobi Telegram'ga `sendMessage` metodini qaytaradi. Yuborish
  natijasini server ko'rmaydi; exactly-once yetkazish kafolati berilmaydi.
- Supabase bepul tarif limitlari amal qiladi. Bu cheksiz va abadiy bepul
  server resursi va'dasi emas; alohida SMS xizmati ishlatilmaydi.
- Keyingi bosqich: Telegram initData'ni serverda tekshirish, haqiqiy user
  sessiyasi, profil va admin vakolatlarini ulash. Hozir bot sozlash siri
  mijozning tizimga kirishi o'rniga ishlatilmaydi.

Oldingi `npm run bot:serve` Node serveri alternativ lokal transport bo'lib
qoldi. `npm run bot:configure` Node `/telegram/webhook` manzili uchun yozilgan;
uni ushbu Supabase deploy yo'riqnomasi bilan aralashtirmang.
