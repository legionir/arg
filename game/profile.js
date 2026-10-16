// پروفایل بازیکن (0.27.0): نام جنگی + لوگو. در همین مرورگر ذخیره می‌شود
// (localStorage) و در اتاق چندنفره برای همه نمایش داده می‌شود (همراه roster
// سرور)؛ هر وقت از منو قابل ویرایش است.
import { t as tr } from "./i18n.js";

export const PROFILE_LOGOS = ["🦁", "🐺", "🦅", "🐉", "⚔️", "🛡️", "👑", "🐎", "🐻", "🦊", "🐯", "🦂"];
export const PROFILE_KEY = "scw.profile";
export const PROFILE_NAME_MAX = 12;

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

export function defaultProfile() {
  return { name: "بی‌نام", logo: 0 };
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

// نشان بازیکن برای roster/تالار: لوگو + نام (نام escape می‌شود).
export function profileBadgeHTML(p) {
  const logo = PROFILE_LOGOS[validLogo(p && p.logo) ?? 0] || "";
  const name = esc(validProfileName(p && p.name) || tr("system.profile.anon"));
  return `<span class="pbadge"><span class="plogo">${logo}</span> ${name}</span>`;
}
