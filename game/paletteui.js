// پالت ساختمان/مزدور + شیلدهای دسته (0.248.0 — C-CLN-42): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { CONFIG } from "./config.js";
import { UNITS } from "./combat.js";
import { BUILDING_CATEGORIES } from "./data.js";
import { buildingInfoHTML, unitInfoHTML } from "./format.js";

function $(id) { return document.getElementById(id); }
export function createPaletteUI({ renderer, PALETTE }) {
  function paintThumbs() {
    for (const btn of document.querySelectorAll("#buildPal [data-b]")) {
      renderer.thumbBuilding(btn.dataset.b, btn.querySelector("canvas"));
    }
    for (const btn of document.querySelectorAll("#unitPal [data-u]")) {
      renderer.thumbUnit(btn.dataset.u, btn.querySelector("canvas"));
    }
  }
  // تغییر زبان: فقط متن کارت‌ها عوض می‌شود (گره‌ها و بوم‌ها می‌مانند).
  // نمایش DoD فاز ۰ بند ۹ (0.79.0): tooltip داده‌محور + خط سیاست + هشدار مشاور.
  // فقط نمایش — state/sim دست‌نخورده. اعداد از TUNING (TAX/RATIONS) می‌آیند.
  function buildPalette() {
    const bp = $("buildPal"), up = $("unitPal");
    if (!bp || !up) return;
    bp.innerHTML = ""; up.innerHTML = "";
    for (const key of PALETTE) {
      const def = CONFIG.BUILDINGS[key];
      if (!def) continue;
      const btn = document.createElement("button");
      btn.className = "bcard"; btn.dataset.b = key;
      btn.innerHTML = `<canvas class="bthumb" width="128" height="112"></canvas>` +
        `<span class="binfo">${buildingInfoHTML(key, def)}</span>`;
      btn.title = (btn.querySelector(".bmeta") || {}).textContent || ""; // کارت فشرده: شرح کامل در تولتیپ
      bp.appendChild(btn);
    }
    for (const [key, def] of Object.entries(UNITS)) {
      if (def.side !== "player" || def.noHire || !def.cost) continue;
      const btn = document.createElement("button");
      btn.className = "bcard"; btn.dataset.u = key;
      btn.innerHTML = `<canvas class="bthumb" width="96" height="84"></canvas>` +
        `<span class="binfo">${unitInfoHTML(def)}</span>`;
      btn.title = (btn.querySelector(".bmeta") || {}).textContent || "";
      up.appendChild(btn);
    }
    paintThumbs();
    // شیت واحدها async لود می‌شود — یک repaint تا اسپرایت واقعی بنشیند
    setTimeout(paintThumbs, 1500);
  }
  buildPalette();
  // شیلدهای دسته پالت ساختمان (0.185.0 — §3.1/بند 138): ۶ دکمه دسته از
  // BUILDING_CATEGORIES؛ کلیک = فقط همان دسته، کلیک دوباره = همه. فقط نما
  // (hidden روی کارت‌ها)؛ sim/ذخیره/هش بی‌خبر. نشست در localStorage.
  const CATS = BUILDING_CATEGORIES.slice();
  let catFilter = null;
  try {
    const cv = localStorage.getItem("scw.catchield");
    if (cv && CATS.includes(cv)) catFilter = cv;
  } catch (e) {}
  function paintCatShields() {
    const box = $("catShields");
    if (!box) return;
    for (const b of box.querySelectorAll("[data-cat]")) {
      b.classList.toggle("sel", b.dataset.cat === catFilter);
    }
    for (const btn of document.querySelectorAll("#buildPal [data-b]")) {
      const def = CONFIG.BUILDINGS[btn.dataset.b];
      btn.hidden = !!catFilter && (!def || def.category !== catFilter);
    }
  }
  {
    const box = $("catShields");
    if (box) {
      for (const b of box.querySelectorAll("[data-cat]")) {
        b.addEventListener("click", () => {
          const c = b.dataset.cat;
          catFilter = catFilter === c ? null : c;
          try {
            if (catFilter) localStorage.setItem("scw.catchield", catFilter);
            else localStorage.removeItem("scw.catchield");
          } catch (e) {}
          paintCatShields();
        });
      }
    }
    paintCatShields();
  }
  return { buildPalette, paintThumbs, paintCatShields };
}
