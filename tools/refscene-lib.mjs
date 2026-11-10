// صحنه مرجع رگرسیون تصویری (0.234.0 — C-TST-4) — خالص، بدون import، بدون DOM.
// یک صحنه قطعی (seed ثابت) به‌صورت فهرست فرمان‌های ترسیمی JSON-پذیر می‌سازد:
//   bg   {c}                  پس‌زمینه یکدست
//   rect {x,y,w,h,c}          مستطیل توپر
//   circ {x,y,r,c}            دایره توپر
//   line {x1,y1,x2,y2,c,w}    پاره‌خط
//   icon {key,col,row}        کاشی آیکون ۲۴×۲۴ از ICON_DATA در گرید (ox,oy,gap)
// نقاشی پیکسلی همین فرمان‌ها در execute_js (OffscreenCanvas) انجام می‌شود و
// هش پیکسل در src/arg/data/ref-scene.json پین است؛ سوئیت (t_tst_refscene) هش
// فرمان‌ها + هش بایت‌های ICON_DATA را پین می‌کند (همگام، بی‌canvas).
// تغییر عمدی صحنه/آیکون‌ها = به‌روزرسانی EXPECTED_* در تست + ref-scene.json.
export const REFSCENE = {
  seed: 20261027,
  w: 320,
  h: 200,
  ox: 8,
  oy: 8,
  gap: 4,
  icon: 24,
  nRect: 40,
  nCirc: 24,
  nLine: 16,
};

const PALETTE = ["#c0392b", "#e67e22", "#f1c40f", "#27ae60", "#2980b9", "#8e44ad", "#ecf0f1", "#16a085"];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// iconKeys: Object.keys(ICON_DATA).sort() سمت فراخوان (lib به game/ وابسته نیست).
export function refSceneCommands(seed, iconKeys) {
  const keys = Array.isArray(iconKeys) ? iconKeys.slice().sort() : [];
  const rnd = mulberry32(seed >>> 0);
  const W = REFSCENE.w, H = REFSCENE.h;
  const pick = () => PALETTE[(rnd() * PALETTE.length) | 0];
  const cmds = [{ k: "bg", c: "#101826" }];
  for (let i = 0; i < REFSCENE.nRect; i++) {
    const w = 4 + ((rnd() * 60) | 0), h = 4 + ((rnd() * 44) | 0);
    cmds.push({ k: "rect", x: (rnd() * (W - w)) | 0, y: (rnd() * (H - h)) | 0, w, h, c: pick() });
  }
  for (let i = 0; i < REFSCENE.nCirc; i++) {
    const r = 3 + ((rnd() * 22) | 0);
    cmds.push({ k: "circ", x: r + ((rnd() * (W - 2 * r)) | 0), y: r + ((rnd() * (H - 2 * r)) | 0), r, c: pick() });
  }
  for (let i = 0; i < REFSCENE.nLine; i++) {
    cmds.push({
      k: "line",
      x1: (rnd() * W) | 0, y1: (rnd() * H) | 0,
      x2: (rnd() * W) | 0, y2: (rnd() * H) | 0,
      c: pick(), w: 1 + ((rnd() * 3) | 0),
    });
  }
  const per = Math.max(1, ((W - REFSCENE.ox * 2 + REFSCENE.gap) / (REFSCENE.icon + REFSCENE.gap)) | 0);
  keys.forEach((key, i) => {
    cmds.push({ k: "icon", key, col: i % per, row: (i / per) | 0 });
  });
  return cmds;
}

// FNV-1a روی رشته UTF-8 — همان تابعی که execute_js روی بایت‌های پیکسل می‌زند
// (آنجا ورودی Uint8 است، اینجا رشته؛ هر دو خروجی hex۸ می‌دهند).
export function fnv1aHex(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return ("0000000" + (h >>> 0).toString(16)).slice(-8);
}

export function refSceneChecksum(cmds) {
  return fnv1aHex(JSON.stringify(cmds));
}
