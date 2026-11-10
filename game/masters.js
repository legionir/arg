// استادان نبرد (0.182.0 — §1.1/بند 102): تاریخچه بازی‌های تک‌نفره تمام‌شده.
// فقط لایه نمایش + ذخیره محلی (localStorage) — sim بی‌خبر است و هیچ میدانی
// به state اضافه نمی‌شود (بدون اثر بر هش/ذخیره/ری‌پلی).
// رکورد: {id, seed, map, outcome: victory|defeat, ticks, secs, date, score}.
// امتیاز guess است (دفترچه فرمول نمی‌دهد — بند ۱۲۷؛ ثبت numbers-registry):
// برد ۱۰۰۰ + جایزه سرعت (۶۰۰−ثانیه، کف صفر)؛ باخت max(۰، ۴۰۰−ثانیه).
// سقف ۲۵۰ رکورد (دفترچه): تازه اول، قدیمی‌ترِ مازاد می‌افتد.
// مرتب‌سازی همان ۴ کلید دفترچه است: امتیاز/نام/زمان بازی/تاریخ.

export const MASTERS_KEY = "scw.masters.v1";
export const MASTERS_CAP = 250;
export const MASTERS_SORTS = ["score", "name", "secs", "date"];
export const MASTERS_SCORE = { winBase: 1000, winBonus: 600, loseBase: 400 };

// خالص.
export function masterScore(outcome, secs) {
  const s = Math.max(0, Math.floor(typeof secs === "number" ? secs : 0));
  if (outcome === "victory") return MASTERS_SCORE.winBase + Math.max(0, MASTERS_SCORE.winBonus - s);
  return Math.max(0, MASTERS_SCORE.loseBase - s);
}

// خالص: ساخت رکورد از پایان بازی سولو.
export function masterEntry(o) {
  const src = o || {};
  const ticks = Math.max(0, src.ticks | 0);
  const secs = Math.max(0, Math.floor(ticks / 10)); // ۱۰ تیک = ۱ ثانیه
  const outcome = src.outcome === "victory" ? "victory" : "defeat";
  const seed = (src.seed >>> 0) || 0;
  const date = typeof src.date === "string" && src.date ? src.date : new Date().toISOString();
  const map = typeof src.map === "string" && src.map ? src.map : "seed:" + seed;
  return {
    id: seed + ":" + ticks + ":" + date,
    seed, map, outcome, ticks, secs, date,
    score: masterScore(outcome, secs),
  };
}

// خالص: افزودن (تازه اول) + هرس سقف. ورودی جهش نمی‌خورد.
export function mastersAdd(list, entry) {
  const base = Array.isArray(list) ? list.slice() : [];
  if (entry && typeof entry === "object") base.unshift(entry);
  return base.slice(0, MASTERS_CAP);
}

// خالص: حذف با id. ورودی جهش نمی‌خورد.
export function mastersDelete(list, id) {
  const base = Array.isArray(list) ? list.slice() : [];
  const i = base.findIndex((e) => e && e.id === id);
  if (i >= 0) base.splice(i, 1);
  return base;
}

// خالص: مرتب‌سازی (کپی تازه). dir: ‏1 صعودی، 1- نزولی.
export function mastersSort(list, key, dir) {
  const base = Array.isArray(list) ? list.slice() : [];
  const k = MASTERS_SORTS.includes(key) ? key : "score";
  const d = dir === 1 ? 1 : -1;
  const val = (e) => {
    if (!e) return "";
    if (k === "name") return String(e.map || "");
    if (k === "secs") return +e.secs || 0;
    if (k === "date") return String(e.date || "");
    return +e.score || 0;
  };
  base.sort((a, b) => {
    const va = val(a), vb = val(b);
    if (va < vb) return -d;
    if (va > vb) return d;
    return String((a && a.id) || "") < String((b && b.id) || "") ? -1 : 1;
  });
  return base;
}

// اعتبارسنجی یک رکورد بارگذاری‌شده (خراب = دور).
function validEntry(e) {
  return !!e && typeof e === "object" &&
    (e.outcome === "victory" || e.outcome === "defeat") &&
    Number.isInteger(e.ticks) && e.ticks >= 0 &&
    Number.isInteger(e.secs) && e.secs >= 0 &&
    Number.isInteger(e.score) && e.score >= 0 &&
    typeof e.map === "string" && typeof e.date === "string" && typeof e.id === "string";
}

// بارگذاری (ناسازگار/خراب = []؛ هرگز throw نمی‌کند).
export function mastersLoad() {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(MASTERS_KEY);
    if (!raw) return [];
    const doc = JSON.parse(raw);
    if (!Array.isArray(doc)) return [];
    return doc.filter(validEntry).slice(0, MASTERS_CAP);
  } catch (e) {
    return [];
  }
}

// ذخیره (private mode و غیره = false؛ هرگز throw نمی‌کند).
export function mastersSave(list) {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(MASTERS_KEY, JSON.stringify((Array.isArray(list) ? list : []).slice(0, MASTERS_CAP)));
    return true;
  } catch (e) {
    return false;
  }
}
