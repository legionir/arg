// صدای سنتزشده (0.48.0 — #۲۵ از FEATURES؛ بازطراحی 0.70.0).
// صفر فایل صوتی: همه صداها در runtime ساخته می‌شوند — جلوه‌ها (knock/chime/clang/rumble/
// fanfare/سکه/بوق) + صداهای رابط (کلیک/هاور/بازگشت/شروع) + بستر باد + پد درون‌ساز +
// موسیقی مولد قطعی دو حالته (منو/بازی، گام حجاز) با ریتم طبل در نبرد + shuffle راهپیمایی.
//
// لایه‌بندی: sim هرگز این را صدا نمی‌زند. حلقه فریم main.js اسنپ‌شات سبک
// می‌دهد؛ diffSoundEvents(prev, curr) خالص و هدلس‌آزمودنی است. ژست‌های UI
// برای بازخورد کلیک ack() را صدا می‌زنند. همه زمان‌بندی پشت کارخانه ctx
// تزریقی است تا تست‌ها بدون صدای واقعی اجرا شوند.

export const VOL_KEY = "stronghold-web-vol";
export const MAX_EVENTS_PER_TICK = 8;

// اسنپ‌شات سبک از وضعیت زنده برای diff صوتی — فقط فیلدهایی که صدا می‌سازند
// (id/type برای تازگی، buildLeft/destroyed برای ساختمان، cooldown/dead/مختصات
// برای یگان، دو پرچم پایان). هر ۵ تیک در حلقه فریم گرفته می‌شود.
export function soundSnapshot(state) {
  return {
    buildings: state.buildings.map((b) => ({
      id: b.id, type: b.type, buildLeft: b.buildLeft || 0, destroyed: !!b.destroyed,
    })),
    units: state.units.map((u) => ({
      id: u.id, cooldown: u.cooldown || 0, dead: !!u.dead, x: u.x, r: u.r,
    })),
    victorious: !!state.victorious,
    defeated: !!state.defeated,
  };
}

export function loadVolumes() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(VOL_KEY) : null;
    if (!raw) return { music: 0.6, sfx: 0.8, muted: false };
    const v = JSON.parse(raw);
    return {
      music: clamp01(typeof v.music === "number" ? v.music : 0.6),
      sfx: clamp01(typeof v.sfx === "number" ? v.sfx : 0.8),
      muted: !!v.muted,
    };
  } catch (e) {
    return { music: 0.6, sfx: 0.8, muted: false };
  }
}

export function saveVolumes(v) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(VOL_KEY, JSON.stringify({ music: v.music, sfx: v.sfx, muted: v.muted }));
    }
  } catch (e) {
    // حالت خصوصی و غیره: ولوم‌ها ماندگار نمی‌شوند. بازی ادامه دارد.
  }
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

// diff خالص اسنپ‌شات → فهرست رویداد صوتی. قطعی: ترتیب موجودیت‌ها ترتیب
// اسنپ‌شات است، خروجی سقف MAX_EVENTS_PER_TICK دارد (آکورد نبرد محدود می‌ماند).
// kindها: placed | completed | razed | strike | death | victory.
export function diffSoundEvents(prev, curr) {
  const out = [];
  if (!prev || !curr) return out;
  const pb = new Map();
  for (const b of prev.buildings || []) pb.set(b.id, b);
  const cb = new Map();
  for (const b of curr.buildings || []) cb.set(b.id, b);
  for (const b of curr.buildings || []) {
    if (!pb.has(b.id)) {
      out.push({ kind: "placed", type: b.type });
    } else {
      const was = pb.get(b.id);
      if ((was.buildLeft || 0) > 0 && (b.buildLeft || 0) === 0) {
        out.push({ kind: "completed", type: b.type });
      }
    }
  }
  for (const b of prev.buildings || []) {
    const now = cb.get(b.id);
    if (!now || now.destroyed) {
      if (!b.destroyed) out.push({ kind: "razed", type: b.type });
    }
  }
  const pu = new Map();
  for (const u of prev.units || []) pu.set(u.id, u);
  const cu = new Map();
  for (const u of curr.units || []) cu.set(u.id, u);
  for (const u of curr.units || []) {
    const was = pu.get(u.id);
    if (was && !was.dead && !u.dead && (u.cooldown || 0) > (was.cooldown || 0)) {
      out.push({ kind: "strike" });
    }
  }
  for (const u of prev.units || []) {
    const now = cu.get(u.id);
    if (!now || now.dead) {
      if (!u.dead) out.push({ kind: "death" });
    }
  }
  if (!prev.victorious && curr.victorious) out.push({ kind: "victory", outcome: "victory" });
  if (!prev.defeated && curr.defeated) out.push({ kind: "victory", outcome: "defeat" });
  return out.slice(0, MAX_EVENTS_PER_TICK);
}

// شمار یگان‌های در حال حرکت بین دو اسنپ‌شات (برای بستر shuffle راهپیمایی).
export function countWalking(prev, curr) {
  if (!prev || !curr) return 0;
  const pb = new Map();
  for (const u of prev.units || []) pb.set(u.id, u);
  let n = 0;
  for (const u of curr.units || []) {
    const was = pb.get(u.id);
    if (was && (was.x !== u.x || was.r !== u.r)) n += 1;
  }
  return n;
}

// ---- موسیقی مولد: گام حجاز روی ر (D) — درون‌ساز قطعی (LCG با بذر ثابت، بدون Math.random) ----
// درجه‌ها (هرتز): ر۳ می‌بمل۳ فادیز۳ سل۳ لا۳ سی‌بمل۳ دوديز۴ ر۴ می‌بمل۴ فادیز۴ سل۴ لا۴
const SCALE = [146.83, 155.56, 185.0, 196.0, 220.0, 233.08, 277.18, 293.66, 311.13, 369.99, 392.0, 440.0];
const ROOT = 73.42; // ر۲ (درون)
const FIFTH = 110.0; // لا۲
// حالت‌ها: spb = ثانیه به ازای هر ضرب؛ gap = فاصله نت‌ها (ضرب)؛ pad/mel = بهره پد و ملودی؛ decay = ماندگاری نت
const MOODS = {
  menu: { spb: 0.95, gaps: [2, 3, 2, 4], pad: 0.5, mel: 0.55, decay: 3.0 },
  game: { spb: 0.8, gaps: [3, 4, 3, 5], pad: 0.28, mel: 0.34, decay: 2.2 },
};
const MAX_VOICES = 28; // سقف هم‌زمانی جلوه‌ها تا آکورد نبرد گوش را نبُرد

export function createSoundManager(o) {
  const opts = o || {};
  const volumes = loadVolumes();
  const has = (obj, fn) => obj && typeof obj[fn] === "function";
  const mgr = {
    volumes,
    started: false,
    mood: "menu",
    log: [], // تازه‌ترین kindها برای پروب E2E (فقط سمت رندر)
    _ctx: null,
    _master: null,
    _musicBus: null,
    _sfxBus: null,
    _padGain: null,
    _melGain: null,
    _voices: [], // زمان پایان صداهای فعال
    _noiseBuf: null,
    _lcg: 20261016,
    _deg: 4,
    _gapIdx: 0,
    _nextNoteAt: 0,
    _nextDrumAt: 0,
    _intensity: 0,
    _intensityAt: 0,
    _lastHover: 0,
    _shuffle: null,

    // باید از ژست کاربر صدا زده شود (سیاست autoplay). ایدم‌پوتنت.
    ensureStarted() {
      if (this.started) {
        if (this._ctx && this._ctx.state === "suspended" && !this._held) this._ctx.resume();
        return true;
      }
      let ctx = null;
      try {
        const factory = opts.ctxFactory || (() => new AudioContext());
        ctx = factory();
      } catch (e) {
        return false; // بدون WebAudio: بازی بی‌صدا ادامه دارد
      }
      if (!ctx) return false;
      this._ctx = ctx;
      this._master = ctx.createGain();
      this._master.gain.value = volumes.muted ? 0 : 1;
      // محدودکننده: آکورد نبرد/کلیک پشت‌سرهم کلیپ نشود (در ctx قلابی/قدیمی نبود = مستقیم)
      let out = this._master;
      try {
        if (has(ctx, "createDynamicsCompressor")) {
          const comp = ctx.createDynamicsCompressor();
          if (comp.threshold) comp.threshold.value = -14;
          if (comp.ratio) comp.ratio.value = 6;
          this._master.connect(comp);
          comp.connect(ctx.destination);
          out = null;
        }
      } catch (e) { out = this._master; }
      if (out) this._master.connect(ctx.destination);
      this._musicBus = ctx.createGain();
      this._musicBus.gain.value = volumes.music * 0.5;
      this._musicBus.connect(this._master);
      this._sfxBus = ctx.createGain();
      this._sfxBus.gain.value = volumes.sfx;
      this._sfxBus.connect(this._master);
      this._startReverb();
      this._startWind();
      this._startPad();
      this.started = true;
      if (ctx.state === "suspended") ctx.resume();
      return true;
    },

    setMusic(v) {
      volumes.music = clamp01(v);
      if (this._musicBus) this._musicBus.gain.value = volumes.music * 0.5;
      saveVolumes(volumes);
    },
    setSfx(v) {
      volumes.sfx = clamp01(v);
      if (this._sfxBus) this._sfxBus.gain.value = volumes.sfx;
      saveVolumes(volumes);
    },
    setMuted(m) {
      volumes.muted = !!m;
      if (this._master) {
        const g = this._master.gain;
        if (this._ctx && has(g, "setTargetAtTime")) g.setTargetAtTime(volumes.muted ? 0 : 1, this._ctx.currentTime, 0.03);
        else g.value = volumes.muted ? 0 : 1;
      }
      saveVolumes(volumes);
    },

    // حالت موسیقی: "menu" | "game" — پد و ملودی نرم کراس‌فید می‌شوند.
    setMood(m) {
      const mood = MOODS[m] ? m : "game";
      this.mood = mood;
      const ctx = this._ctx;
      if (!ctx) return;
      const c = MOODS[mood];
      if (this._padGain && has(this._padGain.gain, "setTargetAtTime")) this._padGain.gain.setTargetAtTime(c.pad, ctx.currentTime, 0.8);
      if (this._melGain && has(this._melGain.gain, "setTargetAtTime")) this._melGain.gain.setTargetAtTime(c.mel, ctx.currentTime, 0.5);
    },

    // تب پنهان/بازگشت: ctx را نگه می‌دارد تا پس‌زمینه صدا نده.
    setSuspended(on) {
      this._held = !!on;
      const ctx = this._ctx;
      if (!ctx) return;
      try {
        if (on && has(ctx, "suspend")) ctx.suspend();
        else if (!on && has(ctx, "resume")) ctx.resume();
      } catch (e) { /* تزئینی */ }
    },

    // شدت نبرد ۰..۱ — طبل را روشن می‌کند و با زمان محو می‌شود.
    setIntensity(v) {
      this._intensity = clamp01(v);
      this._intensityAt = this._ctx ? this._ctx.currentTime : 0;
    },

    // بازخورد ژست بازی (ساخت/دستور/رد/سکه/زنگ/استخدام).
    ack(kind) {
      if (!this.started) return;
      switch (kind) {
        case "deny": this._tone(160, 0.14, "square", 0.22, 110); break;
        case "order": this._tone(660, 0.07, "triangle", 0.2); this._toneAt(880, 0.06, "sine", 0.12, 0.05); break;
        case "coin": this._toneAt(1318, 0.12, "triangle", 0.18, 0); this._toneAt(1760, 0.2, "triangle", 0.16, 0.07); break;
        case "alarm": this._horn(310, 0); this._horn(310, 0.28); break;
        case "hire": this._thud(0.2); this._toneAt(392, 0.12, "triangle", 0.2, 0.05); this._toneAt(587, 0.18, "triangle", 0.2, 0.15); break;
        default: this._knock(0.22); break; // "place" و ناشناخته: تق چوبی
      }
    },

    // صداهای رابط (منو/دکمه‌ها) — صدازدن پیش از شروع امن است.
    ui(kind) {
      if (!this.started) return;
      const now = this._ctx ? this._ctx.currentTime : 0;
      switch (kind) {
        case "hover":
          if (now - this._lastHover < 0.06) return;
          this._lastHover = now;
          this._tone(1480, 0.03, "sine", 0.045);
          break;
        case "back": this._tone(560, 0.09, "triangle", 0.15, 400); break;
        case "open": this._tone(520, 0.08, "triangle", 0.16); this._toneAt(780, 0.1, "triangle", 0.16, 0.06); break;
        case "tick": this._tone(1100, 0.02, "sine", 0.07); break;
        case "start":
          this._thud(0.3);
          [293.66, 440, 587.33].forEach((f, i) => this._toneAt(f, 0.3, "triangle", 0.2, 0.06 + i * 0.09));
          break;
        default: // click
          this._tone(740, 0.05, "triangle", 0.15);
          this._toneAt(1110, 0.04, "sine", 0.08, 0.02);
      }
    },

    // جفت اسنپ‌شات → رویدادهای سنتزشده. صدازدن پیش از شروع امن است (می‌ریزد).
    update(prev, curr) {
      if (!this.started) return [];
      const events = diffSoundEvents(prev, curr);
      for (const e of events) this._play(e);
      this.log.push(...events.map((e) => e.kind));
      if (this.log.length > 50) this.log.splice(0, this.log.length - 50);
      let heat = 0;
      for (const e of events) heat += e.kind === "strike" ? 0.06 : e.kind === "death" ? 0.12 : e.kind === "razed" ? 0.1 : 0;
      if (heat > 0) this.setIntensity(this._decayed() + heat);
      this._shuffleTick(countWalking(prev, curr));
      return events;
    },

    // هر فریم صدا زده می‌شود (ارزان): نت‌ها/طبل را روی ساعت صوتی زمان‌بندی می‌کند.
    tick() {
      const ctx = this._ctx;
      if (!ctx || !this.started || volumes.muted || this._held) return;
      const now = ctx.currentTime;
      const m = MOODS[this.mood];
      if (now >= this._nextNoteAt) {
        this._melody(m);
        const gap = m.gaps[this._gapIdx++ % m.gaps.length];
        this._nextNoteAt = now + gap * m.spb;
      }
      const heat = this._decayed();
      if (heat > 0.22 && now >= this._nextDrumAt) {
        this._thud(0.14 + heat * 0.2);
        this._nextDrumAt = now + (heat > 0.6 ? 0.45 : 0.75);
      }
    },

    _decayed() {
      const ctx = this._ctx;
      if (!ctx) return 0;
      return Math.max(0, this._intensity - Math.max(0, ctx.currentTime - this._intensityAt) * 0.12);
    },

    _rand() {
      this._lcg = (Math.imul(this._lcg, 1664525) + 1013904223) >>> 0;
      return this._lcg / 4294967296;
    },

    _melody(m) {
      // حرکت پله‌ای غالب با جهش گاه‌به‌گاه؛ به ریشه برمی‌گردد تا ملودی دور نشود.
      const r = this._rand();
      let step = r < 0.45 ? 1 : r < 0.75 ? -1 : r < 0.88 ? 2 : -2;
      if (this._deg > 9) step = -Math.abs(step);
      if (this._deg < 2) step = Math.abs(step);
      this._deg = Math.max(0, Math.min(SCALE.length - 1, this._deg + step));
      if (this._rand() < 0.14) return; // سکوت کوتاه = نَفَس
      const f = SCALE[this._deg];
      this._pluck(f, m.decay, 0.2);
      if (this._rand() < 0.3) this._pluck(f * 2, m.decay * 0.6, 0.06);
    },

    _pluck(freq, dur, vol) {
      const ctx = this._ctx;
      if (!ctx || !this._melGain) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      if (has(g.gain, "linearRampToValueAtTime")) g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g);
      g.connect(this._melGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },

    _play(e) {
      switch (e.kind) {
        case "placed": this._knock(0.24); break;
        case "completed":
          this._toneAt(660, 0.16, "sine", 0.22, 0);
          this._toneAt(1320, 0.12, "sine", 0.07, 0);
          this._toneAt(880, 0.24, "sine", 0.22, 0.12);
          this._toneAt(1760, 0.18, "sine", 0.06, 0.12);
          break;
        case "razed":
          this._noise(0.55, 380, 0.34);
          this._tone(78, 0.5, "sine", 0.3, 34);
          break;
        case "strike":
          this._tone(220, 0.09, "square", 0.12);
          this._tone(331, 0.07, "square", 0.08);
          this._noise(0.05, 5200, 0.1, "highpass");
          break;
        case "death":
          this._tone(300, 0.28, "sine", 0.26, 80);
          this._noise(0.18, 900, 0.08);
          break;
        case "victory":
          if (e.outcome === "victory") {
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
              this._toneAt(f, 0.3, "triangle", 0.26, i * 0.16);
              this._toneAt(f / 2, 0.4, "sine", 0.14, i * 0.16);
            });
          } else {
            [392, 311.13, 261.63, 196].forEach((f, i) => {
              this._toneAt(f, 0.34, "triangle", 0.26, i * 0.22);
              this._toneAt(f / 2, 0.45, "sine", 0.14, i * 0.22);
            });
          }
          break;
        default:
          break;
      }
    },

    // تق چوبی: نویز باندپس کوتاه + ضربه پایین
    _knock(vol) {
      this._noise(0.06, 1500, vol * 0.8, "bandpass");
      this._tone(170, 0.09, "square", vol * 0.7, 90);
    },
    // ضربه طبل
    _thud(vol) {
      this._tone(118, 0.26, "sine", vol * 1.6, 42);
      this._noise(0.08, 300, vol * 0.6);
    },
    _horn(freq, delay) {
      this._toneAt(freq, 0.26, "sawtooth", 0.13, delay, freq * 0.97, 700);
    },

    _voiceOk(until) {
      const ctx = this._ctx;
      if (!ctx) return false;
      const now = ctx.currentTime;
      const v = this._voices;
      for (let i = v.length - 1; i >= 0; i--) if (v[i] <= now) v.splice(i, 1);
      if (v.length >= MAX_VOICES) return false;
      v.push(until);
      return true;
    },

    _tone(freq, dur, type, vol, slideTo) {
      this._toneAt(freq, dur, type, vol, 0, slideTo);
    },

    _toneAt(freq, dur, type, vol, delay, slideTo, cutoff) {
      const ctx = this._ctx;
      if (!ctx) return;
      const t0 = ctx.currentTime + (delay || 0);
      if (!this._voiceOk(t0 + dur + 0.02)) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      let tail = osc;
      if (cutoff && has(ctx, "createBiquadFilter")) {
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = cutoff;
        osc.connect(f);
        tail = f;
      }
      tail.connect(g);
      g.connect(this._sfxBus);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },

    _noiseBuffer() {
      const ctx = this._ctx;
      if (this._noiseBuf) return this._noiseBuf;
      const len = Math.max(1, Math.floor(ctx.sampleRate * 1));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      // نویز شبه‌قطعی (بدون Math.random، خروجی پایدار) — یک‌بار ساخته و بازاستفاده می‌شود.
      let seed = 123456789;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        data[i] = (seed / 0x3fffffff - 1) * 0.8;
      }
      this._noiseBuf = buf;
      return buf;
    },

    _noise(dur, cutoff, vol, ftype) {
      const ctx = this._ctx;
      if (!ctx) return;
      const t0 = ctx.currentTime;
      if (!this._voiceOk(t0 + dur)) return;
      const src = ctx.createBufferSource();
      src.buffer = this._noiseBuffer();
      const filt = ctx.createBiquadFilter();
      filt.type = ftype || "lowpass";
      filt.frequency.value = cutoff;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(filt);
      filt.connect(g);
      g.connect(this._sfxBus);
      src.start(t0);
    },

    // پژواک نرم روی باس موسیقی (تأخیر + فیدبک فیلترشده)؛ اگر ctx پشتیبانی نکند حذف می‌شود.
    _startReverb() {
      const ctx = this._ctx;
      try {
        if (has(ctx, "createDelay")) {
        const d = ctx.createDelay(1.0);
        d.delayTime.value = 0.34;
        const fb = ctx.createGain();
        fb.gain.value = 0.38;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 1800;
        const wet = ctx.createGain();
        wet.gain.value = 0.45;
        this._melGain = ctx.createGain();
        this._melGain.gain.value = MOODS[this.mood].mel;
        this._melGain.connect(this._musicBus);
        this._melGain.connect(d);
        d.connect(lp);
        lp.connect(fb);
        fb.connect(d);
        lp.connect(wet);
        wet.connect(this._musicBus);
        }
      } catch (e) {
        this._melGain = null;
      }
      if (!this._melGain) {
        this._melGain = ctx.createGain();
        this._melGain.gain.value = MOODS[this.mood].mel;
        this._melGain.connect(this._musicBus);
      }
    },

    // پد: ریشه + پنجم با دو سایه‌دار دیتیون، فیلتر پایین‌گذر با LFO کند.
    _startPad() {
      const ctx = this._ctx;
      try {
        this._padGain = ctx.createGain();
        this._padGain.gain.value = MOODS[this.mood].pad;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 520;
        lp.connect(this._padGain);
        this._padGain.connect(this._musicBus);
        for (const [f, det, vol] of [[ROOT, -6, 0.5], [ROOT, 6, 0.5], [FIFTH, 0, 0.35]]) {
          const osc = ctx.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.value = f;
          if (osc.detune) osc.detune.value = det;
          const g = ctx.createGain();
          g.gain.value = vol * 0.18;
          osc.connect(g);
          g.connect(lp);
          osc.start();
        }
        if (has(ctx, "createOscillator")) {
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.07;
          const lg = ctx.createGain();
          lg.gain.value = 180;
          lfo.connect(lg);
          if (lp.frequency && typeof lg.connect === "function") lg.connect(lp.frequency);
          lfo.start();
        }
      } catch (e) {
        // پد تزئینی است؛ هرگز بازی را نمی‌شکند.
      }
    },

    _startWind() {
      const ctx = this._ctx;
      if (!ctx) return;
      try {
        const len = ctx.sampleRate * 3;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        let seed = 987654321;
        let last = 0;
        for (let i = 0; i < len; i++) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          const w = seed / 0x3fffffff - 1;
          last = last * 0.98 + w * 0.02; // بستر قهوه‌ای، بدون کلیک در لوپ
          data[i] = last * 3;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const filt = ctx.createBiquadFilter();
        filt.type = "lowpass";
        filt.frequency.value = 300;
        const g = ctx.createGain();
        g.gain.value = 0.05;
        src.connect(filt);
        filt.connect(g);
        g.connect(this._musicBus);
        src.start();
      } catch (e) {
        // امبینت تزئینی است؛ هرگز بازی را نمی‌شکند.
      }
    },

    _shuffleTick(walking) {
      const ctx = this._ctx;
      if (!ctx) return;
      const want = walking >= 6 ? Math.min(0.2, 0.03 + walking * 0.004) : 0;
      if (!this._shuffle && want > 0) {
        try {
          const len = ctx.sampleRate;
          const buf = ctx.createBuffer(1, len, ctx.sampleRate);
          const data = buf.getChannelData(0);
          let seed = 555555555;
          for (let i = 0; i < len; i++) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            data[i] = (seed / 0x3fffffff - 1) * 0.5;
          }
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          const filt = ctx.createBiquadFilter();
          filt.type = "bandpass";
          filt.frequency.value = 900;
          const g = ctx.createGain();
          g.gain.value = 0;
          src.connect(filt);
          filt.connect(g);
          g.connect(this._sfxBus);
          src.start();
          this._shuffle = g;
        } catch (e) {
          return;
        }
      }
      if (this._shuffle) {
        this._shuffle.gain.setTargetAtTime(want, ctx.currentTime, 0.4);
      }
    },
  };
  return mgr;
}
