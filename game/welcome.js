// خوش‌آمد نخستین نبرد (0.284.0): یک کارت کوتاه با داستان، سه قدم اول و کنترل‌ها.
// یک‌بار نمایش (localStorage)، با Esc/دکمه بسته می‌شود؛ در ?test نمایش داده نمی‌شود.
export const WELCOME_KEY = "arg.welcome.v1";

// خالص و تست‌پذیر: آیا باید نشان داده شود؟
export function shouldWelcome(get, search) {
  if (/[?&]test(=|&|$)/.test(search || "")) return false;
  try { return !get(WELCOME_KEY); } catch (e) { return false; }
}

export function wireWelcome(doc) {
  const d = doc || document;
  const box = d.getElementById("welcomeCard"), menu = d.getElementById("menuScreen");
  if (!box || !menu) return;
  const get = (k) => window.localStorage.getItem(k);
  const close = () => {
    box.hidden = true;
    try { window.localStorage.setItem(WELCOME_KEY, "1"); } catch (e) {}
  };
  const btn = d.getElementById("welcomeOk");
  if (btn) btn.addEventListener("click", close);
  d.addEventListener("keydown", (e) => { if (!box.hidden && (e.key === "Escape" || e.key === "Enter")) { e.preventDefault(); close(); } });
  // اولین باری که منو بسته می‌شود (= نبرد شروع شد) کارت می‌آید.
  const mo = new MutationObserver(() => {
    if (menu.hidden && shouldWelcome(get, window.location.search)) { box.hidden = false; if (btn) btn.focus({ preventScroll: true }); mo.disconnect(); }
  });
  mo.observe(menu, { attributes: true, attributeFilter: ["hidden"] });
}
