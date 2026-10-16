// ناوبری منوی اصلی (چندصفحه‌ای): صفحه اول فقط فهرست دکمه‌هاست؛ هر دکمه به بخش خودش می‌رود.
// منطق ناوبری (پشته صفحه‌ها) خالص و تست‌پذیر است؛ اتصال DOM در bindMenuNav جداست.
// فقط لایه نمایش — به sim/ذخیره/هش دست نمی‌زند.

export const MENU_PAGES = ["home", "solo", "mp", "profile", "settings"];

// پشته: همیشه با "home" شروع می‌شود. go(home) پشته را ریست می‌کند؛ go(x) دوبار پشت‌سرهم تکرار نمی‌شود.
export function createMenuNav() {
  let stack = ["home"];
  return {
    get current() { return stack[stack.length - 1]; },
    get depth() { return stack.length; },
    go(page) {
      const p = MENU_PAGES.includes(page) ? page : "home";
      if (p === "home") stack = ["home"];
      else if (stack[stack.length - 1] !== p) stack.push(p);
      return this.current;
    },
    back() {
      if (stack.length > 1) stack.pop();
      return this.current;
    },
    reset() { stack = ["home"]; return "home"; },
  };
}

// اتصال به DOM. hooks.onPage(page) بعد از هر تغییر صفحه صدا زده می‌شود (صدا/…).
export function bindMenuNav(hooks) {
  const h = hooks || {};
  const box = document.getElementById("menuBox");
  const screen = document.getElementById("menuScreen");
  if (!box || !screen) return null;
  const nav = createMenuNav();
  const pages = [...box.querySelectorAll(".menu-page")];

  function render(focus) {
    const cur = nav.current;
    box.dataset.page = cur;
    for (const p of pages) p.hidden = p.dataset.page !== cur;
    screen.scrollTop = 0;
    if (focus) {
      const page = pages.find((p) => p.dataset.page === cur);
      const target = cur === "home"
        ? page.querySelector(".nav-btn:not([hidden])")
        : page.querySelector(".page-back");
      if (target) target.focus({ preventScroll: true });
    }
    if (typeof h.onPage === "function") h.onPage(cur);
  }

  box.addEventListener("click", (e) => {
    const el = e.target.closest("[data-go],[data-proxy]");
    if (!el || !box.contains(el)) return;
    if (el.dataset.go) { nav.go(el.dataset.go); render(true); return; }
    const t = document.getElementById(el.dataset.proxy);
    if (t) t.click();
  });

  // Esc در زیرصفحه = بازگشت یک مرحله (بدون اینکه شنونده سراسری بازی هم اجرا شود)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || screen.hidden || nav.depth < 2) return;
    // مودال بازِ روی منو اول بسته می‌شود (شنونده سراسری)
    const ov = document.getElementById("modalOverlay");
    if (ov && !ov.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    nav.back();
    render(true);
  }, true);

  // آیتم «آنلاین» فقط وقتی سرور در دسترس است (همان شرط دکمه نوار پایین)
  const onl = document.getElementById("onlineIconBtn"), navOnl = document.getElementById("navOnline");
  if (onl && navOnl) {
    const sync = () => { navOnl.hidden = onl.hidden; };
    sync();
    new MutationObserver(sync).observe(onl, { attributes: true, attributeFilter: ["hidden"] });
  }

  render(false);
  return {
    nav,
    go(p) { nav.go(p); render(false); },
    reset() { nav.reset(); render(false); },
    get current() { return nav.current; },
  };
}
