import "@fontsource-variable/manrope";
import "@fontsource-variable/dm-sans";
import "./style.css";

const icons = {
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  right: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  wrench: '<path d="m14 6 4 4 3-3a7 7 0 0 1-9 9l-6 6-4-4 6-6a7 7 0 0 1 9-9z"/>',
  scan: '<path d="M7 3H3v4m14-4h4v4M3 17v4h4m14-4v4h-4M3 12h18M7 8h10v8H7z"/>',
  oil: '<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
  wheel:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="m5 6 5 4m4 4 5 4m-1-13-4 5m-4 4-4 5M3 12h6m6 0h6m-9-9v6m0 6v6"/>',
  engine:
    '<path d="M3 10h3l3-4h8v3h4v9H8l-2-4H3zM2 7v10m9-14h5m-2 0v3"/><path d="m14 9-3 4h5l-3 4"/>',
  brake:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3m9 6h-3m-6 9v-3m-9-6h3m10-7-2 2m-6 10-2 2"/>',
  snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7m-12-3 3.3 3 3.3-3m-6.6 16 3.3-3 3.3 3M3 11l4-1-1-4m15 7-4 1 1 4M6 18l1-4-4-1m15-7-1 4 4 1"/>',
  shield:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone:
    '<path d="m8 3 3 5-3 3a15 15 0 0 0 5 5l3-3 5 3c-1 6-6 5-10 3S3 13 3 8c0-3 2-5 5-5Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  rotate: '<path d="M20 7V3m0 4h-4m4 0a9 9 0 1 0 1 9"/><path d="M9 9v6l5-3z"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
const star =
  '<svg class="brand-star" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="m27 0-2 15 13-8-8 13 18 4-17 4 8 13-13-8-3 15-4-16-13 8 8-13L0 23l15-4L7 6l13 8z"/></svg>';
const services = [
  {
    name: "Kompyuter diagnostikasi",
    icon: "scan",
    desc: "Taxminlarga o‘rin yo‘q. Avtomobilingiz holatini aniq bilib oling.",
    tag: "ANIQLIKDAN BOSHLAYMIZ",
    detail:
      "Elektron boshqaruv bloklari, xatolik kodlari va sensorlar ko‘rsatkichlarini tekshiramiz. Natijalarni tushuntirib, zarur ishlar ro‘yxatini siz bilan kelishamiz.",
    points: [
      "Elektron tizimlarni skanerlash",
      "Xatolik kodlarini tahlil qilish",
      "Holat bo‘yicha tushunarli tavsiyalar",
    ],
  },
  {
    name: "Moy va filtr almashtirish",
    icon: "oil",
    desc: "Dvigatelingiz uchun toza nafas. Harakat uchun yangi quvvat.",
    tag: "REJALI TEXNIK XIZMAT",
    detail:
      "Avtomobil ishlab chiqaruvchisi talablariga mos moy va filtrlarni tanlashda yordam beramiz. Almashtirish bilan birga asosiy suyuqliklar holatini tekshiramiz.",
    points: [
      "Dvigatel moyini almashtirish",
      "Moy va havo filtrlarini tekshirish",
      "Texnik suyuqliklar nazorati",
    ],
  },
  {
    name: "Yurish qismini ta’mirlash",
    icon: "wheel",
    desc: "Har qanday yo‘lda barqarorlik, qulaylik va ishonchli boshqaruv.",
    tag: "RAVON HARAKAT",
    detail:
      "Osma va rul boshqaruv tizimidagi shovqin, tebranish va nosozliklarni tekshiramiz. Almashtirish zarur bo‘lgan qismlar va ish hajmini oldindan kelishamiz.",
    points: [
      "Osma va amortizatorlar ko‘rigi",
      "Rul boshqaruvini tekshirish",
      "Eskirgan qismlarni almashtirish",
    ],
  },
  {
    name: "Dvigatel xizmati",
    icon: "engine",
    desc: "Avtomobilingiz yuragiga e’tibor. Uning quvvatini his qiling.",
    tag: "ISHONCHLI QUVVAT",
    detail:
      "Dvigatel ishlashidagi o‘zgarishlar, ortiqcha sarf va begona tovushlar sababini aniqlaymiz. Ta’mirlash rejasi diagnostika natijalariga asoslanadi.",
    points: [
      "Dvigatel holatini baholash",
      "Sovutish tizimini tekshirish",
      "Nosoz qismlarni ta’mirlash",
    ],
  },
  {
    name: "Tormoz tizimi",
    icon: "brake",
    desc: "Eng muhim lahzada ishonch. Xavfsizligingiz har doim birinchi.",
    tag: "XAVFSIZLIK BIRINCHI",
    detail:
      "Tormoz kolodkalari, disklar va suyuqlik holatini ko‘rikdan o‘tkazamiz. Tormozlashdagi shovqin va tebranish sabablarini tekshiramiz.",
    points: [
      "Kolodka va disklar nazorati",
      "Tormoz suyuqligini tekshirish",
      "Tizim ishini baholash",
    ],
  },
  {
    name: "Konditsioner xizmati",
    icon: "snow",
    desc: "Tashqarida qanday ob-havo bo‘lmasin, salonda qulaylik.",
    tag: "HAR MAVSUMDA QULAYLIK",
    detail:
      "Konditsionerning sovutish samaradorligi va tizim zichligini tekshiramiz. Salon filtri va havo aylanishiga ham e’tibor beramiz.",
    points: [
      "Sovutish tizimi diagnostikasi",
      "Sizib chiqishni tekshirish",
      "Salon filtri nazorati",
    ],
  },
];

document.querySelector("#app").innerHTML = `
  <header class="header wrap">
    <a class="brand" href="#" aria-label="Avto Servis — bosh sahifa">${star}<span>AVTO<span class="brand-light">SERVIS</span><small>CARE FOR YOUR DRIVE</small></span></a>
    <nav class="desktop-nav" aria-label="Asosiy menyu"><a href="#xizmatlar">Xizmatlar</a><a href="#biz-haqimizda">Nega biz?</a><a href="#jarayon">Qanday ishlaymiz</a><a href="#savollar">Savollar</a></nav>
    <button class="btn btn-dark header-cta" data-book>Qabulga yozilish ${icon("arrow")}</button>
    <button class="menu-toggle icon-btn" aria-label="Menyuni ochish" aria-expanded="false" aria-controls="mobile-nav">${icon("menu")}</button>
  </header>
  <nav id="mobile-nav" class="mobile-nav" aria-label="Mobil menyu" hidden><a href="#xizmatlar">Xizmatlar</a><a href="#biz-haqimizda">Nega biz?</a><a href="#jarayon">Qanday ishlaymiz</a><a href="#savollar">Savollar</a><button class="btn btn-green" data-book>Qabulga yozilish ${icon("arrow")}</button></nav>
  <main>
    <section class="hero wrap" aria-labelledby="hero-title">
      <div class="hero-grid"></div><div class="hero-watermark" aria-hidden="true">DRIVE.</div>
      <div class="hero-copy"><p class="eyebrow hero-eyebrow"><span class="status-dot"></span> AVTOMOBILINGIZ UCHUN YANGI STANDART</p><h1 id="hero-title">Har kilometrda<br><span>ishonch.</span></h1><p class="hero-description">Siz yo‘ldan zavq oling.<br>Avtomobilingizga biz g‘amxo‘rlik qilamiz.</p><div class="hero-actions"><button class="btn btn-green" data-book>Qabulga yozilish ${icon("arrow")}</button><a class="text-link" href="#xizmatlar">Xizmatlarimiz ${icon("right")}</a></div><div class="hero-note">${icon("shield")} Aniqlik. Halollik. Professional yondashuv.</div></div>
      <div class="car-area"><div class="scene-top"><span><i></i> PERFORMANCE IN EVERY DETAIL</span><span class="scene-index">LIVE / 3D</span></div><div id="car-scene" role="img" aria-label="Aylantirish mumkin bo‘lgan kumushrang sport avtomobilining 3D modeli"><div class="car-fallback" aria-hidden="true"><svg viewBox="0 0 700 350"><defs><linearGradient id="body" x2="0" y2="1"><stop stop-color="#e5e9e6"/><stop offset=".5" stop-color="#8b9490"/><stop offset="1" stop-color="#303a35"/></linearGradient></defs><ellipse cx="350" cy="287" rx="280" ry="24" fill="#000" opacity=".6"/><path d="m65 212 45-45 111-24 63-65 141-3 99 70 105 35 22 61-39 20H94l-42-17z" fill="url(#body)"/><path d="m237 142 57-53h122l72 58z" fill="#17251e"/><path d="m354 90-7 54m-230 35 114-19m289 4 91 33" stroke="#c9efcf" stroke-width="5"/><g fill="#111"><circle cx="186" cy="245" r="49"/><circle cx="537" cy="245" r="49"/></g><g fill="#858d88" stroke="#d2d8d3" stroke-width="5"><circle cx="186" cy="245" r="28"/><circle cx="537" cy="245" r="28"/></g></svg></div></div><div class="scene-bottom"><span class="drag-hint">${icon("rotate")} <span>Aylantirib ko‘ring</span></span><span class="model-caption">PRECISION. PASSION. PERFORMANCE.</span><span class="badge-3d">3D</span></div></div>
      <div class="hero-bottom"><span><span class="mini-cross">+</span> PROFESSIONAL DIAGNOSTIKA</span><span><span class="mini-cross">+</span> SHAFFOF NARXLAR</span><span><span class="mini-cross">+</span> SIFATGA E’TIBOR</span><a href="#xizmatlar" aria-label="Xizmatlar bo‘limiga o‘tish">PASTGA SURING <span>↓</span></a></div>
    </section>
    <section class="brand-strip wrap" aria-label="Turli avtomobil markalari uchun xizmat"><span class="brand-strip-label">HAR BIR AVTOMOBILGA<br>ALOHIDA YONDASHUV</span><div class="car-brands"><span class="chevrolet"><svg viewBox="0 0 60 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 3h20v6h17l-6 7H40v5H20v-5H3l6-7h11z"/></svg>CHEVROLET</span><span class="kia">KIA</span><span class="hyundai"><i>H</i> HYUNDAI</span><span class="byd">BYD</span><span class="toyota">TOYOTA</span></div></section>
    <section class="services section wrap" id="xizmatlar"><div class="section-top"><div><p class="eyebrow"><span class="tiny-square"></span> XIZMATLARIMIZ</p><h2>Mukammal holat.<br><span>Har bir detalda.</span></h2></div><div class="section-aside"><p>Oddiy texnik xizmatdan murakkab ta’mirgacha.<br>Avtomobilingizga kerak bo‘lgan barchasi bir joyda.</p><a class="text-link dark-link" href="#service-grid">Barcha xizmatlar <span class="count">06</span> ${icon("arrow")}</a></div></div><div class="service-grid" id="service-grid">${services.map((s, i) => `<button class="service-card ${i === 0 ? "featured" : ""}" data-service="${i}"><div class="service-card-top"><span class="service-icon">${icon(s.icon)}</span><span class="service-number">0${i + 1}</span></div><span class="service-name">${s.name}</span><span class="service-description">${s.desc}</span><span class="service-card-bottom"><span>${s.tag}</span><span class="card-arrow">${icon("arrow")}</span></span></button>`).join("")}</div></section>
    <section class="about section wrap" id="biz-haqimizda"><div class="about-visual"><div class="engineering-grid"></div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="mechanic-mark">${star}</div><span class="visual-label">BUILT ON TRUST.<br>DRIVEN BY CARE.</span><span class="visual-coordinates">41° / PRECISION ENGINEERING</span><div class="quality-label">${icon("shield")} <div>Har bir detal muhim.<small>Biz uchun avtomobilingiz — mas’uliyat.</small></div></div></div><div class="about-copy"><p class="eyebrow"><span class="tiny-square"></span> NEGA AYNAN BIZ?</p><h2>Yaxshi servis —<br><span>xotirjamlik degani.</span></h2><p class="section-description">Texnik atamalar ortiga yashirinmaymiz. Muammoni sodda tushuntiramiz, yechimni birga tanlaymiz va har bir ishga e’tibor bilan yondashamiz.</p><div class="benefit">${icon("scan")}<div><h3>Avval sabab, keyin yechim</h3><p>Ta’mirlashni aniq diagnostikadan boshlaymiz.</p></div></div><div class="benefit">${icon("shield")}<div><h3>Kutilmagan xarajatlarsiz</h3><p>Ish hajmi va narxini oldindan siz bilan kelishamiz.</p></div></div><div class="benefit">${icon("clock")}<div><h3>Vaqtingizni qadrlaymiz</h3><p>Qabul va xizmat muddatlarini birga rejalashtiramiz.</p></div></div></div></section>
    <section class="process section wrap" id="jarayon"><div class="section-top"><div><p class="eyebrow"><span class="tiny-square"></span> OSON VA TUSHUNARLI</p><h2>3 qadam. <span>Xotirjam yo‘l.</span></h2></div><p class="section-description">Ortiqcha tashvishsiz.<br>Barchasi oddiy suhbatdan boshlanadi.</p></div><div class="process-grid"><article><span class="step-number">01<span>${icon("arrow")}</span></span><h3>Qabulni rejalashtiring</h3><p>Qulay kun va xizmatni tanlang.<br>Tashrif tafsilotlarini kelishib olamiz.</p></article><article><span class="step-number">02<span>${icon("arrow")}</span></span><h3>Holatni aniqlaymiz</h3><p>Avtomobilni tekshirib, kerakli ishlar<br>va ularning narxini tushuntiramiz.</p></article><article><span class="step-number">03<span>${icon("check")}</span></span><h3>Yo‘lingizda davom eting</h3><p>Kelishilgan ishlarni bajaramiz.<br>Siz esa haydashdan zavq olasiz.</p></article></div></section>
    <section class="faq section wrap" id="savollar"><div><p class="eyebrow"><span class="tiny-square"></span> SAVOLLARGA JAVOBLAR</p><h2>Bilish foydali.<br><span>So‘rash oson.</span></h2><p class="section-description">Ko‘p beriladigan savollarga<br>ochiq va tushunarli javoblar.</p></div><div class="faq-list">${[
      [
        "Oldindan yozilish shartmi?",
        "Oldindan yozilish tashrifingizni qulay rejalashtirishga yordam beradi. Forma orqali kerakli xizmat va kunni tanlab, arizani tayyorlashingiz mumkin. Qabul vaqti servis bilan alohida tasdiqlanadi.",
      ],
      [
        "Xizmat narxi qanday belgilanadi?",
        "Narx avtomobil modeli, ehtiyot qismlar va ish hajmiga bog‘liq. Ko‘rikdan keyin narxni siz bilan kelishamiz. Roziligingizsiz qo‘shimcha ish boshlanmaydi.",
      ],
      [
        "Qaysi avtomobillarga xizmat ko‘rsatiladi?",
        "Xizmat turi avtomobilning modeli va texnik xususiyatlariga bog‘liq. Arizada avtomobilingiz modeli va muammoni yozing — ish imkoniyati tashrifdan oldin aniqlashtiriladi.",
      ],
      [
        "Ta’mirlash qancha vaqt oladi?",
        "Davomiylik nosozlik va ehtiyot qismlar mavjudligiga bog‘liq. Diagnostikadan so‘ng taxminiy muddatni kelishamiz va o‘zgarishlar bo‘lsa xabar beramiz.",
      ],
    ]
      .map(
        ([q, a], i) =>
          `<details ${i === 0 ? "open" : ""}><summary>${q}<span>${icon("plus")}</span></summary><p>${a}</p></details>`,
      )
      .join("")}</div></section>
    <section class="cta wrap"><div class="cta-decoration" aria-hidden="true">${star}</div><div><p class="eyebrow">KEYINGI MANZIL — XOTIRJAMLIK</p><h2>Avtomobilingizga<br>e’tibor berish vaqti.</h2><p>Yaxshi parvarish uzoq yo‘lning boshlanishi.</p></div><button class="btn btn-dark" data-book>Qabulni rejalashtirish ${icon("arrow")}</button></section>
  </main>
  <footer class="footer wrap"><div class="footer-main"><a class="brand" href="#" aria-label="Bosh sahifa">${star}<span>AVTO<span class="brand-light">SERVIS</span><small>CARE FOR YOUR DRIVE</small></span></a><p>Avtomobilga e’tibor.<br>Insonga hurmat.</p><nav aria-label="Pastki menyu"><a href="#xizmatlar">Xizmatlar</a><a href="#biz-haqimizda">Nega biz?</a><a href="#savollar">Savollar</a></nav><a class="back-top" href="#">Yuqoriga ${icon("arrow")}</a></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} AVTO SERVIS. Barcha huquqlar himoyalangan.</span><span>HAR KILOMETRDA ISHONCH <span class="footer-dot">●</span></span></div></footer>
  <dialog id="service-dialog" class="modal"><button class="modal-close icon-btn" aria-label="Yopish">${icon("close")}</button><div id="service-detail"></div></dialog>
  <dialog id="booking-dialog" class="modal booking-modal"><button class="modal-close icon-btn" aria-label="Yopish">${icon("close")}</button><div id="booking-content"></div></dialog>
`;

// Keep the navigation and form available while the 3D engine loads.
import("./car-scene.js")
  .then(({ initCarScene }) =>
    initCarScene(document.querySelector("#car-scene")),
  )
  .catch(() => {
    document.querySelector("#car-scene").dataset.webgl = "unavailable";
  });
const menuButton = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector("#mobile-nav");
menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!expanded));
  mobileNav.hidden = expanded;
  menuButton.setAttribute(
    "aria-label",
    expanded ? "Menyuni ochish" : "Menyuni yopish",
  );
});
mobileNav.querySelectorAll("a,button").forEach((el) =>
  el.addEventListener("click", () => {
    mobileNav.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Menyuni ochish");
  }),
);

const serviceDialog = document.querySelector("#service-dialog");
const bookingDialog = document.querySelector("#booking-dialog");
document.querySelectorAll("[data-service]").forEach((btn) =>
  btn.addEventListener("click", () => {
    const index = Number(btn.dataset.service),
      s = services[index];
    document.querySelector("#service-detail").innerHTML =
      `<span class="modal-service-icon">${icon(s.icon)}</span><p class="eyebrow">${s.tag}</p><h2>${s.name}</h2><p class="modal-description">${s.detail}</p><ul class="service-points">${s.points.map((p) => `<li>${icon("check")}${p}</li>`).join("")}</ul><div class="price-note"><span>Xizmat narxi</span><strong>Ko‘rikdan so‘ng kelishiladi</strong></div><button class="btn btn-dark modal-book">Qabulni rejalashtirish ${icon("arrow")}</button>`;
    document.querySelector(".modal-book").addEventListener("click", () => {
      closeDialog(serviceDialog);
      openBooking(index);
    });
    showDialog(serviceDialog);
  }),
);

function showDialog(dialog) {
  dialog.showModal();
  document.body.classList.add("modal-open");
}
function closeDialog(dialog) {
  dialog.close();
  document.body.classList.remove("modal-open");
}
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog
    .querySelector(".modal-close")
    .addEventListener("click", () => closeDialog(dialog));
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeDialog(dialog);
    }
  });
  dialog.addEventListener("close", () =>
    document.body.classList.remove("modal-open"),
  );
});
document
  .querySelectorAll("[data-book]")
  .forEach((btn) => btn.addEventListener("click", () => openBooking()));
function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function openBooking(selected = "") {
  document.querySelector("#booking-content").innerHTML =
    `<p class="eyebrow"><span class="tiny-square"></span> BIRINCHI QADAM</p><h2>Qabulni<br>rejalashtiramiz.</h2><p class="modal-description">Ma’lumotlarni kiriting va tashrif arizasini tayyorlang.</p><form id="booking-form"><div class="form-row"><label>Ismingiz<input name="name" autocomplete="given-name" placeholder="Ismingiz" required minlength="2" maxlength="60" /></label><label>Telefon raqamingiz<input type="tel" name="phone" autocomplete="tel" placeholder="+998 90 123 45 67" required pattern="[+0-9 ()-]{9,22}" maxlength="22" /></label></div><label>Kerakli xizmat<select name="service" required><option value="">Xizmatni tanlang</option>${services.map((s, i) => `<option value="${i}" ${selected === i ? "selected" : ""}>${s.name}</option>`).join("")}<option value="other">Maslahat kerak</option></select></label><div class="form-row"><label>Avtomobil modeli<input name="car" placeholder="Masalan, Chevrolet Malibu" maxlength="80" required /></label><label>Qulay kun<input type="date" name="date" min="${localDate()}" required /></label></div><label>Izoh <span class="optional">(ixtiyoriy)</span><textarea name="note" rows="2" maxlength="500" placeholder="Avtomobilingiz haqida qisqacha..."></textarea></label><p class="form-notice">${icon("shield")} Ariza qurilmangizda tayyorlanadi. Uni servisga yuborib, qabul vaqtini alohida tasdiqlang.</p><button class="btn btn-dark submit-btn" type="submit">Arizani tayyorlash ${icon("arrow")}</button></form>`;
  document.querySelector("#booking-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const phoneDigits = data.phone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      e.target.phone.setCustomValidity("Telefon raqamini to‘liq kiriting.");
      e.target.phone.reportValidity();
      return;
    }
    if (data.date < localDate()) {
      e.target.date.setCustomValidity(
        "Bugungi yoki kelajakdagi kunni tanlang.",
      );
      e.target.date.reportValidity();
      return;
    }
    const service = services[Number(data.service)]?.name || "Maslahat kerak";
    const text = `AVTO SERVIS — tashrif arizasi\n\nIsm: ${data.name}\nTelefon: ${data.phone}\nAvtomobil: ${data.car}\nXizmat: ${service}\nIstalgan sana: ${data.date}\nIzoh: ${data.note || "—"}\n\nQabul vaqti servis tomonidan alohida tasdiqlanadi.`;
    document.querySelector("#booking-content").innerHTML =
      `<div class="success-icon">${icon("check")}</div><p class="eyebrow">KEYINGI QADAMGA TAYYOR</p><h2>Arizangiz<br>tayyorlandi.</h2><p class="modal-description">Arizani yuklab oling va servis administratoriga yuboring. Qabul vaqti hali tasdiqlanmagan.</p><div class="booking-summary"><span>Tanlangan xizmat<strong id="summary-service"></strong></span><span>Istalgan sana<strong id="summary-date"></strong></span></div><button class="btn btn-dark submit-btn" id="download-booking">Arizani yuklab olish ${icon("download")}</button><button class="success-close">Yopish</button>`;
    document.querySelector("#summary-service").textContent = service;
    document.querySelector("#summary-date").textContent = new Date(
      `${data.date}T12:00:00`,
    ).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    document
      .querySelector("#download-booking")
      .addEventListener("click", () => {
        const url = URL.createObjectURL(
          new Blob([text], { type: "text/plain;charset=utf-8" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "avtoservis-ariza.txt";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    document
      .querySelector(".success-close")
      .addEventListener("click", () => closeDialog(bookingDialog));
    document.querySelector("#download-booking").focus();
  });
  document
    .querySelector("#booking-form")
    .addEventListener("input", (e) => e.target.setCustomValidity?.(""));
  showDialog(bookingDialog);
}

document.querySelectorAll(".faq-list details").forEach((detail) =>
  detail.addEventListener("toggle", () => {
    if (detail.open)
      document.querySelectorAll(".faq-list details").forEach((other) => {
        if (other !== detail) other.open = false;
      });
  }),
);
