// حلقه زمان با گام ثابت (CORE-002): منطق مستقل از فریم‌ریت، با سقف جبران.
// رندر با alpha() بین دو تیک درون‌یابی می‌کند (فاز ۰ بند ۱) — alpha فقط نما
// است و هرگز وارد sim/هش/ذخیره نمی‌شود.
export function createClock({ hz, onTick, maxPerFrame = 5 }) {
  let acc = 0;
  let last = -1;
  let getFlags = () => ({ paused: false, speed: 1 });
  return {
    attach(fn) { getFlags = fn; },
    frame(now) {
      if (last < 0) { last = now; return 0; }
      let dt = (now - last) / 1000;
      last = now;
      const { paused, speed } = getFlags();
      if (paused) return 0;
      if (dt > 0.25) dt = 0.25;
      if (dt <= 0) return 0;
      acc += dt * speed;
      const step = 1 / hz;
      let n = 0;
      while (acc >= step && n < maxPerFrame) { acc -= step; n++; }
      if (n > 0) onTick(n);
      if (acc > step * maxPerFrame) acc = step * maxPerFrame;
      return n;
    },
    reset() { acc = 0; last = -1; },
    // پیشرفت به‌سوی تیک بعدی در [۰،۱] برای درون‌یابی نمایشی (فاز ۰ بند ۱).
    // خالص‌نماست: خواندن آن sim را جلو نمی‌برد؛ هنگام pause همان مقدار
    // منجمد می‌ماند (قاب منجمد) و پس از reset صفر است.
    alpha() {
      const step = 1 / hz;
      const a = acc / step;
      return a <= 0 ? 0 : a >= 1 ? 1 : a;
    },
    hz() { return hz; },
  };
}
