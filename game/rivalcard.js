// کارت حریف در صفحه راه‌اندازی نبرد (0.281.0): پرتره + نام + منش + جمله فرمانروای انتخاب‌شده.
// فقط نما — انتخاب همچنان با #persSel است (game/menuui.js)؛ این ماژول فقط آن را می‌خواند.
import { CONFIG } from "./config.js";
import { t, onLangChange } from "./i18n.js";
import { lordPortraitSrc } from "./profile.js";
import { PERSONALITY_LORD } from "./foeinfo.js";

// داده خالص کارت برای یک شناسه شخصیت (تست‌پذیر؛ شناسه نامعتبر = پیش‌فرض).
export function rivalCardData(key) {
  const k = CONFIG.AI.personalities[key] ? key : CONFIG.AI.defaultPersonality;
  const p = CONFIG.AI.personalities[k];
  return { key: k, name: p.name, desc: p.desc, quote: t("game.personality." + k + ".quote"), face: lordPortraitSrc(PERSONALITY_LORD[k] || 0) };
}

export function wireRivalCard(doc) {
  const d = doc || document;
  const sel = d.getElementById("persSel"), face = d.getElementById("rivalFace");
  const name = d.getElementById("rivalName"), desc = d.getElementById("rivalDesc"), quote = d.getElementById("rivalQuote");
  if (!sel || !face || !name || !desc || !quote) return () => {};
  const paint = () => {
    const c = rivalCardData(sel.value);
    face.src = c.face; face.alt = c.name;
    name.textContent = c.name; desc.textContent = c.desc; quote.textContent = c.quote;
  };
  sel.addEventListener("change", paint);
  onLangChange(paint);
  paint();
  return paint;
}
