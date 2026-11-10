// پیشرفت کمپین (0.225.0 — فاز ۲): قفل‌گشایی پیشرونده + رکورد per-مأموریت.
// فقط view + localStorage (الگوی masters.js)؛ sim/هش/ذخیره/ری‌پلی بی‌خبرند.
// شکل پیشرفت: { done: { [key]: { ticks, secs } } }.
import { MISSIONS } from "./missions.js";

export const CAMPAIGN_KEY = "scw.campaign.v1";

export function campaignBlank() {
  return { done: {} };
}

function validRec(r) {
  return !!r && typeof r === "object" &&
    Number.isInteger(r.ticks) && r.ticks >= 0 &&
    Number.isInteger(r.secs) && r.secs >= 0;
}

// بارگذاری (ناسازگار/خراب = خالی؛ هرگز throw نمی‌کند).
export function campaignLoad() {
  try {
    if (typeof localStorage === "undefined") return campaignBlank();
    const raw = localStorage.getItem(CAMPAIGN_KEY);
    if (!raw) return campaignBlank();
    const doc = JSON.parse(raw);
    if (!doc || typeof doc !== "object" || !doc.done || typeof doc.done !== "object") return campaignBlank();
    const done = {};
    for (const k of Object.keys(doc.done)) {
      if (typeof k === "string" && k.length <= 32 && validRec(doc.done[k])) done[k] = doc.done[k];
    }
    return { done };
  } catch (e) {
    return campaignBlank();
  }
}

// ذخیره (private mode و غیره = false؛ هرگز throw نمی‌کند).
export function campaignSave(prog) {
  try {
    if (typeof localStorage === "undefined") return false;
    const p = prog && typeof prog === "object" ? prog : campaignBlank();
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify({ done: p.done && typeof p.done === "object" ? p.done : {} }));
    return true;
  } catch (e) {
    return false;
  }
}

// خالص: ثبت برد مأموریت (بهترین تیک نگه داشته می‌شود). ورودی جهش نمی‌خورد.
export function campaignRecord(prog, key, ticks) {
  const base = prog && prog.done && typeof prog.done === "object" ? { ...prog.done } : {};
  const t = Math.max(0, ticks | 0);
  const prev = base[key];
  if (!validRec(prev) || t < prev.ticks) {
    base[key] = { ticks: t, secs: Math.floor(t / 10) };
  }
  return { done: base };
}

// خالص: مأموریت iام باز است اگر اول باشد یا قبلی تمام شده باشد.
export function campaignUnlocked(prog, index) {
  if (!Number.isInteger(index) || index < 0 || index >= MISSIONS.length) return false;
  if (index === 0) return true;
  const prev = MISSIONS[index - 1];
  const done = prog && prog.done && typeof prog.done === "object" ? prog.done : {};
  return !!prev && validRec(done[prev.key]);
}

// خالص: جست‌وجوی مأموریت با کلید (نامعتبر = null).
export function missionByKey(key) {
  if (typeof key !== "string" || !key) return null;
  for (const m of MISSIONS) if (m && m.key === key) return m;
  return null;
}

export function missionIndex(key) {
  if (typeof key !== "string" || !key) return -1;
  for (let i = 0; i < MISSIONS.length; i++) if (MISSIONS[i] && MISSIONS[i].key === key) return i;
  return -1;
}

// نام/شرح نمایشی به زبان جاری (lang صریح تا تست‌پذیر بماند).
export function missionName(doc, lang) {
  if (!doc) return "";
  if (lang === "en" && typeof doc.nameEn === "string" && doc.nameEn) return doc.nameEn;
  return typeof doc.name === "string" ? doc.name : "";
}

export function missionBrief(doc, lang) {
  if (!doc) return "";
  if (lang === "en" && typeof doc.briefEn === "string" && doc.briefEn) return doc.briefEn;
  return typeof doc.brief === "string" ? doc.brief : "";
}
