// اسکن حقوقی خودکار (0.60.0 — رتبه ۲ SOURCE-REVIEW؛ معادل legal.test.js منبع).
// خالص و بدون import. فهرست شناسه‌های اختصاصی از BANNED-NAMES.md منبع
// (تطابق زیررشته‌ای، بی‌توجه به حروف): هر متن shipped بازی نباید هیچ‌کدام را
// داشته باشد. عمداً ممنوع نیست: stronghold تنها (واژه عمومی)، واژگان قرون‌وسطایی
// عمومی (keep/barracks/knight/… و crusader به‌عنوان اسم عام)، و ابزارها
// (phaser/esm.sh/perchance).
// نکته خود-ارجاعی: همین فایل (فهرست) و tests.js (فیکسچرهای مثبت) ذاتاً حاوی
// شناسه‌ها هستند و از اسکن مستثنا می‌شوند؛ بسته مرجع
// src/stronghold-v-ii-src-1 (استناد منجمد 00-brief) هم «گزارش می‌شود، تخلف نیست».
export const BANNED_NAMES = [
  "firefly studios", // سازنده بازی اصلی
  "gathering of developers", // ناشر اصلی
  "take-two interactive", // ناشر اصلی (فرم کامل)
  "stronghold crusader", // عنوان اصلی (دقیق)
  "stronghold legends", // اسپین‌آف (دقیق)
  "stronghold kingdoms", // اسپین‌آف (دقیق)
  "stronghold 2", // دنباله (دقیق)
  "stronghold 3", // دنباله (دقیق)
];

// اسکن یک متن: آرایه شناسه‌های پیداشده (بدون تکرار، به ترتیب فهرست)؛ ورودی
// غیررشته‌ای = [].
export function scanBanned(text) {
  if (typeof text !== "string" || !text) return [];
  const low = text.toLowerCase();
  return BANNED_NAMES.filter((b) => low.indexOf(b) >= 0);
}

// اسکن همه رشته‌های name/desc کاتالوگ‌های محتوا (CONFIG + UNITS): خروجی
// {hits, checked} که checked شمار رشته‌های خوانده‌شده است.
export function scanContent(cfg, units) {
  const texts = [];
  const walk = (v) => {
    if (typeof v === "string") { texts.push(v); return; }
    if (Array.isArray(v)) { for (const e of v) walk(e); return; }
    if (v && typeof v === "object") {
      for (const k of Object.keys(v)) {
        if (k === "name" || k === "desc" || k === "title") walk(v[k]);
        else if (k !== "source") walk(v[k]);
      }
    }
  };
  walk(cfg);
  walk(units);
  const hits = [];
  for (const t of texts) {
    for (const b of scanBanned(t)) {
      if (hits.indexOf(b) < 0) hits.push(b);
    }
  }
  return { hits, checked: texts.length };
}

// نام شخصیت‌ها و روایت بازی‌های دیگر که هرگز نباید به متن shipped برگردند (0.277.0 — هویت اورجینال).
// فقط نام‌های متمایز؛ واژه‌های عام (wolf/rat/lion/…) عمداً در فهرست نیستند.
export const BANNED_CHARACTERS = [
  "saladin", "lionheart", "baibars", "kahinah", "nizar", "crusades",
  "صلاح‌الدین", "صلاح الدین", "جنگ‌های صلیبی", "شیردل",
];

// اسکن یک متن برای هر دو فهرست (شناسه‌های تجاری + شخصیت‌ها).
export function scanForeign(text) {
  if (typeof text !== "string" || !text) return [];
  const low = text.toLowerCase();
  return scanBanned(text).concat(BANNED_CHARACTERS.filter((b) => low.indexOf(b) >= 0));
}

// اسکن همه بسته‌های زبان ([{fa:{…}, en:{…}}, …]) + هر متن اضافه (نام/شرح مأموریت‌ها).
export function scanPacks(packs, extra) {
  const hits = [];
  let checked = 0;
  const see = (v) => {
    if (typeof v !== "string") return;
    checked++;
    for (const h of scanForeign(v)) if (hits.indexOf(h) < 0) hits.push(h);
  };
  for (const p of packs || []) for (const lang of Object.keys(p)) for (const k of Object.keys(p[lang])) see(p[lang][k]);
  for (const v of extra || []) see(v);
  return { hits, checked };
}
