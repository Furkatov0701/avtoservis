# Avto ilovasi — qarorlar va bosqichlar

## Joriy bosqich — Telegram Mini App, 2026-11-08

Foydalanuvchi Telegram bot orqali ochiladigan Mini App va Telegram akkaunti
orqali kirish yo'nalishini tasdiqladi. SMS/email/parol va parol tiklashni asosiy
kirish usuli sifatida ulash ishlari to'xtatiladi. Oldingi auth qarorlari quyida
tarix sifatida saqlangan; yangi yo'nalish ustun turadi.

- Tasdiqlangan dizayn, admin/user menyulari, userning o'z profilini tahrirlashi
  va mashina qo'shishi, xizmatlarni faqat admin yozishi saqlanadi.
- Ilovaga alohida parol kerak bo'lmaydi. Telegram akkauntining o'zini tiklash
  Telegram zimmasida; bot bu vakolatga ega emas.
- 2026-11-08 tekshiruv: mavjud 21 individual lokal test va preview build o'tdi.
  Telegram integratsiyasi hali yo'q; biznes ekranlari namuna ma'lumotlarida.
- Profil SQL migratsiyasining bajarilganini foydalanuvchi Success natijasi bilan
  tasdiqladi. Masofadagi sxema/RLS agent tomonidan mustaqil tekshirilmagan.
- Supabase tarmoq ruxsati draftda bor, runtime'da custom hostlar bo'sh. Bu
  tashqi tekshiruvni to'sadi; lokal ishlab chiqish va testlar davom etishi mumkin.
- Telegram uchun eski profil FK, sessiya va admin bootstrap'ini alohida yangi
  migratsiya/oqim bilan moslashtirish kerak; mavjud ma'lumotlar o'chirilmaydi.
- Batafsil holat, dalillar va 7 bosqich: [Telegram Mini App reja](telegram-mini-app-reja.md).

## Telegram birinchi bosqich — 2026-11-08

- Foydalanuvchi boshlashni so'radi. Telegram rejimi va bot webhook poydevori yozildi.
- Foydalanuvchi bot username'ini berdi: @urgutservis_bot. Public frontend
  konfiguratsiyasi shu botga yo'naltirildi. Token serverga kiritilmagan, haqiqiy
  bot API tekshiruvi va hosting ulanishi hali bajarilmagan.
- SDK/viewport/BackButton, tashqi brauzer yo'riqnomasi, SDK xatosida retry va
  URL launch hashini saqlaydigan ichki navigatsiya qo'shildi.
- `/start`, `/help`, Mini App tugmasi, webhook secret/body nazorati va
  botni sozlash scripti tayyorlandi. Telegram'ga haqiqiy xabar yuborilmadi.
- Akkauntga kirish va bazaga murojaat hali yo'q; tashqi initData faqat
  UI konteksti sifatida ko'riladi, user/admin vakolati bermaydi.
- 12 ta Node, 5 ta Telegram brauzer, 7 ta UI va 7 ta eski Auth testi o'tdi
  (jami 31). Telegram SDK taqlid qilindi, webhook lokal HTTP'da tekshirildi.
- Preview va Telegram production buildlari o'tdi. Manba kodlari lokal Git
  commitiga kiritiladi; ushbu bosqich GitHub'ga push yoki nashr qilmaydi.
- Ulanish yo'riqnomasi: [telegram-setup.md](telegram-setup.md).

## Auth bo'yicha tasdiqlar — 2026-11-07

- Ochiq ro'yxatdan o'tish faqat user uchun.
- Birinchi admin serverdagi xavfsiz dastlabki sozlash orqali tayinlanadi.
- Telefon → SMS kodi → kerak bo'lsa yangi parol va tasdiqlash formasi tasdiqlandi.
- Foydalanuvchi Supabase loyiha ochilmaganini va SMS xizmati tanlanmaganini aytdi.
- Ko'rsatmalar: [auth-setup.md](auth-setup.md). Tayyor integratsiyani yoqish
  uchun loyiha public URL/kaliti, profil migratsiyasi va SMS sozlamalari kerak.
- Hozirgi nashrdagi UI namunasiga o'zgartirish chiqarilmagan.

## 3-bosqich kod natijasi — 2026-11-07

- Supabase SDK, login, faqat user ro'yxati, SMS tasdiqlash/qayta yuborish,
  parolni tiklash va hozirgi parol orqali almashtirish yaratildi.
- Sessiya serverda tekshiriladi; rol `profiles` jadvalidan olinadi. Xato yoki
  profil yo'qligida kabinet ochilmaydi. URL va user metadata vakolat bermaydi.
- Faqat profil jadvali migratsiyasi, RLS, ustun ruxsatlari va bir martalik
  admin bootstrap scripti tayyor. Masofadagi bazada hech biri bajarilmagan.
- 7 ta Node testi o'tdi (jumladan PGlite PostgreSQL'da profil izolyatsiyasi,
  role/ID/insert/delete taqiqlari va admin bootstrap). Bu to'liq Supabase emas.
- 7 ta auth brauzer testi o'tdi: login xatosi, refresh, chiqish, rolga mos menyu,
  parallel yuborishdan himoya, profil xatosi, signup/OTP, tiklash, parol almashtirish
  va avval tasdiqlanmagan telefonni tasdiqlash. API javoblari testda taqlid qilindi.
- Oldingi 7 ta UI/landing regressiya testi o'tdi. 320 px SMS formasi vizual ko'rildi.
- Preview va live production buildlari o'tdi; live build faqat test konfiguratsiyada.
- Haqiqiy SMS yetkazilishi va masofadagi Supabase/Auth/RLS integratsiyasi kutilmoqda.
  Avtomobil/xizmat ma'lumotlari va profil tahriri keyingi bosqichlarga tegishli.

## 2-bosqich natijasi — 2026-11-06

- React, Tailwind CSS, React Router va lokal Roboto Condensed shrifti ulandi.
- `app/` alohida kirish nuqtasi; eski landingning o‘rnini bosish qarori ochiq
  bo‘lgani uchun root landing saqlandi. Bu vaqtinchalik qo‘shimcha UI manzili.
- Markaziy tokenlar, SVG ikonalar, header, role-specific navigatsiya, kartalar,
  formalar, modal va yuklanish/bo‘sh/xato/ruxsat holatlari yaratildi.
- Namuna ekranlari: admin/user kirish va ro‘yxat formasi, admin bosh sahifasi,
  mijozlar ro‘yxati, avtomobillar, xizmatlar, xizmat tafsilotlari va profil.
- Namuna ma’lumotlar alohida `src/cabinet/demo.js` faylida. Barcha ekranlarda
  tashqi ko‘rish paneli bu UI namunasi ekanini bildiradi. Haqiqiy login yoki
  yozish, SMS yuborish, akkaunt yaratish amalga oshirilmaydi.
- Kelishilmagan qo‘shimcha formalar o‘rnida keyingi bosqich haqida izoh bor.
- G‘ildirak joylashuvlari tasdiqlanmagani uchun kartalar vaqtincha raqamlangan.
  Sana yorliqlari va demo qiymatlari DB talablari tasdig‘i hisoblanmaydi.
- HashRouter statik hostingda to‘g‘ridan-to‘g‘ri URL va yangilashni qo‘llaydi.
- 7 ta Playwright testi o‘tdi: ekranlar, navigatsiya, avtomobil konteksti,
  qidiruv/pagination, forma tekshiruvi va chiqish ogohlantirishi, UI holatlari,
  320/360/390/430 px kengliklar, bosish maydonlari va eski landing regressiyasi.
- Haqiqiy Auth/RLS, serverga yozish, akkauntlararo izolyatsiya va saqlangan
  ma’lumotning keyin qaytishi hali tekshirilmagan; ular integratsiya bosqichida.
- UI namunasi https://furkatov0701.github.io/avtoservis/app/ manziliga chiqarildi.
  GitHub Pages deploy bosqichi muvaffaqiyatli tugadi (2026-11-06).
  Nashr commiti: `994e41d07769ae7a532e6ba6ba47cf09e423acf9`.
  Tasdiq: https://github.com/Furkatov0701/avtoservis/actions/runs/42218851729/job/127895615070
- Qo‘shimcha 3 ta forma validatsiya testi va production builddagi assetlar,
  avtomobil tanlash, xizmatga o‘tish hamda refresh tekshiruvi ham o‘tdi.

## Tasdiqlangan dizayn manbasi — 2026-11-05

Foydalanuvchi shu suhbatda yuborgan, tepasida “AVTO | OQ · BEJ · YASHIL”
yozuvi bo‘lgan 4×4 mobil ekranlar kollajini tanladi va “1 ga 1 o‘xshasin” dedi.
Shu rasm vizual manba: oq yuzalar, krem kartochkalar, bej ikkilamchi tugmalar,
to‘q yashil asosiy tugmalar, ingichka chegaralar, yumaloq ikki rangli ikonalar,
ikki ustunli avtomobil/xizmat kartalari va pastki navigatsiya.
Oldingi 3D landing yangi ilova uchun dizayn manbasi emas.

Oldingi yozma talabga ko‘ra telefon korpusi, kamera kesimi, soat va batareya
web-interfeysga kiritilmaydi. Namunaviy ismlar, avtomobillar, sanalar va aksiya
qiymatlari haqiqiy ma’lumot sifatida saqlanmaydi.

Palitra: #FFFFFF, #334155, #235347, #F2E6D6, #C8A99D.

## Tasdiqlangan navigatsiya — 2026-11-05

Foydalanuvchi tavsiya qilingan alohida admin va user menyularini aniq qo‘llab-quvvatladi.
Ushbu qaror qayta tasdiqlatilmaydi va oldingi menyu takliflarini almashtiradi.

- Admin: Bosh sahifa → Mijozlar → Mashinalar → Bo‘limlar → Profil.
- User: Mashinalar → Xizmatlar → Profil.
- User Mashinalar ekranida o‘z avtomobillarini ko‘radi va tanlaydi.
- Xizmatlar tanlangan avtomobilga tegishli. To‘rtta kartochka: Balonlar,
  Motor moyi, Tonirovka, Antifriz. Har biridan so‘nggi xizmat va tarix ochiladi.
- Avtomobil tanlanmagan bo‘lsa, “Avval avtomobilni tanlang” holati ko‘rsatiladi.
  Tanlanganda yuqorida avtomobil modeli va davlat raqami turadi.
- Profil orqali shaxsiy ma’lumotlar, tahrirlash va chiqish ochiladi.
- Rasmning ranglari, ikonalar uslubi va faol menyu indikatori saqlanadi.
  User menyusidagi uchta element — tasdiqlangan dizayn moslashtirishi.
- Bu tasdiq boshqa biznes takliflari yoki mavjud landingni almashtirish
  qarorining tasdig‘i sifatida talqin qilinmaydi.

## Tasdiqlangan user vakolatlari — 2026-11-05

Foydalanuvchi userni faqat ko‘rish bilan cheklash qoidasini o‘zgartirdi:

- User o‘z profilini tahrirlay oladi.
- User o‘z kirish parolini almashtira oladi; bu Supabase Auth orqali bajariladi,
  parol profil yoki mijoz jadvalida saqlanmaydi.
- User o‘ziga avtomobil qo‘sha oladi. Server/RLS egani sessiyadagi userga
  bog‘laydi; boshqa mijozga yozish yoki mavjud avtomobilni egallab olish huquqi berilmaydi.
- Telefon/login raqamini almashtirishning tasdiqlash talabi saqlanadi;
  uning amaliy oqimi Auth bosqichida kelishiladi.
- Userning mavjud avtomobil ma’lumotlarini tahrirlash vakolati hali kelishilmagan.

## Tasdiqlangan xizmat yozish vakolati — 2026-11-06

Foydalanuvchi xizmat yozuvlarini user ham kirita olishi haqidagi savolga
“yo‘q, buni admin kiritadi” deb javob berdi.

- Balonlar, motor moyi, tonirovka va antifriz bo‘yicha xizmat yozuvlarini
  faqat admin kiritadi va tahrirlaydi.
- User o‘z avtomobilining xizmat ma’lumotlari va tarixini faqat ko‘radi;
  xizmat sanasi, kilometri va keyingi muddatni o‘zi kiritmaydi yoki o‘zgartirmaydi.
- Ushbu cheklov kelajakda server va Supabase RLS orqali ham ta’minlanadi.
- Profil tahriri, parol almashtirish va o‘ziga avtomobil qo‘shish vakolatlari saqlanadi.

Bu talablar tasdiqlangan, ammo hali kodda amalga oshirilmagan.

## Tasdiq kutilayotgan boshlang‘ich takliflar

- Bitta servis; bir mijozga bir nechta avtomobil.
- Ikki sana: bajarilgan va keyingi tavsiya etilgan sana.
- Balon kartalari: old chap, old o‘ng, orqa chap, orqa o‘ng.
- Mavjud 3D landing saqlanadimi yoki yangi ilova uni almashtiradimi?

## Rasm va matn orasidagi aniqlashtiriladigan farqlar

- Pastki menyu farqi hal qilindi: yuqoridagi tasdiqlangan navigatsiya qo‘llanadi.
- Rasmda admin ro‘yxatdan o‘tish va mijozga parol kiritish ekranlari bor;
  yozma talab adminni ochiq yaratishni nazarda tutmaydi. Ko‘rinishning
  tasdiqlanishi ushbu vakolatlarni avtomatik tasdiqlamaydi.
- Rasmda to‘rtta bo‘limdan keyin “Yana...” bor; yozma talab vazifasiz
  “Yana...” tugmasini taqiqlaydi.

## Keyingi bosqichlar uchun saqlangan ochiq masalalar

- Mijoz tafsiloti, avtomobil va xizmat formalarining tuzilishini amalga
  oshirishdan oldin ko‘rsatish va tasdiqlatish.
- Telegram kirishi SMS/parol oqimini almashtiradi. Bot, server sessiyasi va
  mijozni Telegram akkauntiga xavfsiz bog‘lash yangi bosqichda bajariladi.
- Avtomobilni o‘tkazish, o‘chirish va xizmatni o‘chirish/arxivlash tasdiqlanmagan.

## Bajarilgan ish va tekshiruv

- Nashr qilingan muhitdan davom etishda yangi 15 bo‘limli prompt qayta o‘qildi.
  U 16 ekranli maketni tasdiqlangan manba deb belgilaydi; dizayn qayta so‘ralmaydi.
- Mavjud `package.json` va `src/main.js` dastlab tekshirildi: o‘sha payt loyiha Vite va oddiy
  JavaScript/Three.js landingdan iborat edi; React, Router va Tailwind keyin 2-bosqichda o‘rnatildi.
- Dastlabki “Hozir kod yozma” talabi birinchi javobda bajarildi. Keyingi
  “dizayn asosida loyihani ketma-ket qur” topshirig‘i bilan UI bosqichi boshlandi.
  Ochiq biznes qarorlari esa avtomatik tasdiqlangan deb olinmadi.
- 2-bosqich chegarasi: React/Vite, Tailwind, Router, markaziy dizayn sozlamalari
  va qayta ishlatiladigan UI komponentlari. Tayyorlik: build muvaffaqiyatli,
  320/360/390/430 px ko‘rinishlarda gorizontal scrollsiz, 44 px bosish maydonlari,
  fokus va navigatsiya ishlashi, maketga vizual solishtirish. Auth/DB integratsiyasi
  bu bosqichning tayyorlik da’vosiga kirmaydi.

- Foydalanuvchi bergan talablar matni va tanlangan rasm ko‘rib chiqildi.
- Mavjud loyiha README va Git holati o‘qildi.
- Dastlab faqat qarorlar hujjati yaratildi; keyinchalik UI komponentlari va
  tekshiruvlari yuqoridagi 2-bosqichda bajarildi. Auth va DB hali tekshirilmagan.
- Landingni almashtirish bajarilmadi. Havola so‘roviga ko‘ra yangi UI
  qo‘shimcha `/app/` manzili sifatida GitHub Pages’ga yuborildi.
