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
