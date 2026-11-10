// پروفایل بازیکن: نام جنگی + پرتره لرد. در همین مرورگر ذخیره می‌شود
// (localStorage) و در اتاق چندنفره برای همه نمایش داده می‌شود (همراه roster
// سرور)؛ هر وقت از منو قابل ویرایش است.
//
// پرتره‌ها (۲۹ تصویر در assets/lords — جایگزین ایموجی‌های 0.27.0):
// اندیس لوگو همان اندیس این فهرست است (۰..۲۸) و همان عدد در بایت اسلات
// سرور ذخیره می‌شود؛ لوگوهای قدیمی ۰..۱۱ همچنان معتبرند و حالا پرتره
// نشان می‌دهند. مسیر از ریشه ژنراتور است چون نشان‌ها به‌صورت <img>
// داینامیک در DOM ریشه تزریق می‌شوند (مبانی نسبی ماژول نه).
export const LORD_PORTRAIT_BASE = "src/arg/assets/lords/";
export const PROFILE_LORDS = [
  { file: "Baibars.png", name: "Baibars" },
  { file: "Baldwin.png", name: "Baldwin" },
  { file: "Bullseye.png", name: "Bullseye" },
  { file: "Emperor-Frederick.png", name: "Frederick" },
  { file: "King-Philip.png", name: "Philip" },
  { file: "Richard-the-Lionheart.png", name: "Richard" },
  { file: "Saladin.png", name: "Saladin" },
  { file: "The-Abbot.png", name: "Abbot" },
  { file: "The-Caliph.png", name: "Caliph" },
  { file: "The-Canary.png", name: "Canary" },
  { file: "The-Crocodile.png", name: "Crocodile" },
  { file: "The-Emir.png", name: "Emir" },
  { file: "The-Jewel.png", name: "Jewel" },
  { file: "The-Kahinah.png", name: "Kahinah" },
  { file: "The-Lioness.png", name: "Lioness" },
  { file: "The-Marshal.png", name: "Marshal" },
  { file: "The-Nizar.png", name: "Nizar" },
  { file: "The-Nomad.png", name: "Nomad" },
  { file: "The-Pig.png", name: "Pig" },
  { file: "The-Rat.png", name: "Rat" },
  { file: "The-Sentinel.png", name: "Sentinel" },
  { file: "The-Sergeant.png", name: "Sergeant" },
  { file: "The-Sheriff.png", name: "Sheriff" },
  { file: "The-Snake.png", name: "Snake" },
  { file: "The-Sultan.png", name: "Sultan" },
  { file: "The-Surgeon.png", name: "Surgeon" },
  { file: "The-Trader.png", name: "Trader" },
  { file: "The-Wazir.png", name: "Wazir" },
  { file: "The-Wolf.png", name: "Wolf" },
];
// سازگاری: PROFILE_LOGOS حالا فهرست فایل‌های پرتره است (طول ۲۹)؛
// رندر مستقیم رشته نداریم — با lordPortraitHTML تصویر بساز.
export const PROFILE_LOGOS = PROFILE_LORDS.map((l) => l.file);
export const PROFILE_KEY = "scw.profile";
export const PROFILE_NAME_MAX = 12;

// نام‌های پیش‌فرض انگلیسی (هم‌مرتبه با پرتره‌ها؛ همه ≤۱۲ نویسه و معتبر
// برای validProfileName). کاربر تازه به‌جای «بی‌نام» یکی را تصادفی می‌گیرد.
export const PROFILE_RANDOM_NAMES = PROFILE_LORDS.map((l) => l.name);
export function randomDefaultName() {
  const i = (Math.random() * PROFILE_RANDOM_NAMES.length) | 0;
  return PROFILE_RANDOM_NAMES[i] || "Richard";
}

// نام معتبر: ۱..۱۲ نویسه پس از trim — آینه قانون سرور (فارسی/عربی، لاتین،
// رقم، فاصله، خط تیره/زیرین). خروجی null یعنی نامعتبر.
export function validProfileName(s) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (t.length < 1 || t.length > PROFILE_NAME_MAX) return null;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    const ok = c === 32 || c === 45 || c === 95 || c === 0x200C || c === 0x200D ||
      (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) ||
      (c >= 0x0600 && c <= 0x06FF);
    if (!ok) return null;
  }
  return t;
}

export function validLogo(i) {
  return Number.isInteger(i) && i >= 0 && i < PROFILE_LOGOS.length ? i : null;
}

// نمایش‌نام لرد برای title/alt (رشته خام — فراخوان escape می‌کند).
export function lordName(i) {
  const v = validLogo(i);
  return v === null ? "" : PROFILE_LORDS[v].name;
}

// مسیر پرتره ("" یعنی لوگوی نامعتبر — فراخوان تصویری نمی‌کشد).
export function lordPortraitSrc(i) {
  const v = validLogo(i);
  return v === null ? "" : LORD_PORTRAIT_BASE + PROFILE_LORDS[v].file;
}

function escAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// تگ <img> پرتره ("" برای لوگوی نامعتبر).
export function lordPortraitHTML(i) {
  const src = lordPortraitSrc(i);
  if (!src) return "";
  return `<img class="lordFace" src="${src}" alt="${escAttr(lordName(i))}" loading="lazy" draggable="false" onerror="this.style.visibility='hidden'">`;
}

export function defaultProfile() {
  return { name: randomDefaultName(), logo: 0 };
}

// خواندن پروفایل ذخیره‌شده؛ مهاجرت از کلید قدیمی نام جنگی (0.23.0).
export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const name = validProfileName(p && p.name);
      const logo = validLogo(p && p.logo);
      if (name !== null && logo !== null) return { name, logo };
    }
    const old = localStorage.getItem("stronghold_warname");
    const name = validProfileName(old || "");
    if (name !== null) {
      const p = { name, logo: 0 };
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
      return p;
    }
  } catch {}
  return defaultProfile();
}

// اولین اجرا (0.152.0 — §۱.۱/بند ۱۰۳): هیچ پروفایل ذخیره‌شده‌ای نیست
// (نه کلید تازه، نه نام جنگی قدیمی قابل‌مهاجرت) — getter تزریق‌پذیر تا
// در سوئیت با حافظه مصنوعی تست شود؛ پیش‌فرض همان localStorage واقعی.
export function firstRunAsk(get) {
  const g = get || ((k) => { try { return localStorage.getItem(k); } catch { return null; } });
  let raw = null, old = null;
  try { raw = g(PROFILE_KEY); } catch {}
  try { old = g("stronghold_warname"); } catch {}
  if (raw) {
    try {
      const pr = JSON.parse(raw);
      if (validProfileName(pr && pr.name) !== null && validLogo(pr && pr.logo) !== null) return false;
    } catch {}
  }
  if (validProfileName(old || "") !== null) return false;
  return true;
}

export function saveProfile(p) {
  const name = validProfileName(p && p.name);
  const logo = validLogo(p && p.logo);
  if (name === null || logo === null) return null;
  const out = { name, logo };
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(out)); } catch {}
  return out;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// نشان بازیکن برای roster/تالار: پرتره + نام (نام escape می‌شود؛ نام
// نامعتبر = یک نام انگلیسی تصادفی، نه «بی‌نام»).
export function profileBadgeHTML(p) {
  const face = lordPortraitHTML(validLogo(p && p.logo) ?? 0);
  const name = esc(validProfileName(p && p.name) || randomDefaultName());
  return `<span class="pbadge"><span class="plogo">${face}</span> ${name}</span>`;
}
