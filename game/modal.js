// مودال‌ها (0.241.0 — C-CLN-21): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// وضعیت opener داخلی کارخانه است (همان let بوت)؛ overlay/modals از بوت می‌آیند.
export function createModals(overlay, modals) {
  let opener = null; // عنصری که مودال را باز کرد — با بستن فوکوس برمی‌گردد
  function open(key) {
    if (overlay.hidden) opener = document.activeElement;
    for (const [k, el] of Object.entries(modals)) el.hidden = k !== key;
    overlay.hidden = false;
    const first = modals[key].querySelector(".modalClose");
    if (first) first.focus({ preventScroll: true });
  }

  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    const o = opener; opener = null;
    if (o && typeof o.focus === "function" && document.contains(o)) o.focus({ preventScroll: true });
  }

  function toggle(key) {
    if (!overlay.hidden && !modals[key].hidden) close();
    else open(key);
  }
  return { open, close, toggle };
}
