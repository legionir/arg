// RNG مرکزی بازی (0.37.0 — هسته قطعی #۱ از FEATURES).
// قرارداد: تنها منبع تصادف sim همین است (mulberry32 با seed صریح).
// - منطق بازی (economy/combat/pathfind/construction/terrain/mp) هرگز
//   Math.random/Date.now نمی‌بیند؛ آن‌ها فقط در لابی/آنلاین (backoff) و
//   انتخاب سید تصادفی UI و FPS هستند.
// - خروجی float در [0,1) مثل قبل؛ دنباله برای سید یکسان، همیشه یکسان.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// عدد صحیح قطعی در [lo,hi] از یک تابع rnd.
export function randInt(rnd, lo, hi) {
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

// انتخاب قطعی یک عضو از آرایه (ایده‌آل برای ترکیب موج/غنیمت آینده).
export function randPick(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length)];
}

// --- جریان RNG سریال‌شدنی sim (فاز ۰ بند ۲: ممیزی قطعیت) ---
//
// قرارداد:
// - تنها منبع تصادف sim همین است (mulberry32). منطق بازی هرگز
//   Math.random/Date.now نمی‌بیند؛ آن‌ها فقط در لابی/آنلاین (backoff)،
//   انتخاب سید تصادفی UI و FPS هستند.
// - حالت جریان یک عدد صحیح بدون‌علامت ۳۲بیتی است (`state.rng`) که در ذخیره
//   می‌ماند و در هش mix می‌شود؛ پس save/load و ری‌پلی و MP دنباله را نمی‌شکنند.
// - `null` یعنی «هنوز مصرف نشده»: نخستین draw از `mapSeed` مشتق می‌شود، پس
//   بازی‌های تازه و ذخیره‌های قدیمی (بدون فیلد rng) بدون مقداردهی صریح هم
//   قطعی‌اند. مقایسه حتماً با `== null` است (۰ مقدار معتبر است، نه غایب).
// - drawهای بی‌حالتِ AI/موج از `statelessRand(seed,tick,salt)` می‌آیند (تابع
//   خالص از اعداد ذخیره‌شونده) و جریان را جلو نمی‌برند.

// نمک ترکیب (seed,tick,salt) — همان فرمول aiRandAt سابق (بدون تغییر دنباله).
const SALT_MUL = 0x9e3779b9;

// draw بی‌حالت: فقط تابعی از سه عدد صحیح.
export function statelessRand(seed, tick, salt) {
  const rnd = mulberry32((((seed >>> 0) ^ (tick | 0) ^ (((salt | 0) * SALT_MUL) | 0)) >>> 0));
  return rnd();
}

// مقداردهی صریح جریان از سید (اختیاری — تنبل هم خودکار می‌شود).
export function seedSimRng(state, seed) {
  state.rng = (seed == null ? 0 : seed) >>> 0;
  return state.rng;
}

// یک گام mulberry32 روی state.rng (همان ثابت‌های سازنده closure بالا، پس
// دنباله rngNext از سید S دقیقاً با mulberry32(S) یکی است).
export function rngNext(state) {
  let a = (state.rng == null ? (state.mapSeed == null ? 0 : state.mapSeed) : state.rng) | 0;
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  state.rng = a >>> 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// راحتی برای مصرف‌کننده‌های آینده sim (صحیح در بازه / انتخاب از آرایه).
export function rngInt(state, lo, hi) {
  return lo + Math.floor(rngNext(state) * (hi - lo + 1));
}

export function rngPick(state, arr) {
  return arr[Math.floor(rngNext(state) * arr.length)];
}
