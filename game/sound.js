// صدای سنتزشده (0.48.0 — #۲۵ از FEATURES، الگوی CHG-030 مرجع).
// صفر فایل صوتی: همه صداها (knock/chime/clang/sweep/fanfare + بستر باد +
// pluck پنتاتونیک قطعی + shuffle راهپیمایی) در runtime ساخته می‌شوند.
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

// گام پنتاتونیک برای موسیقی مولد (راوند-رابین قطعی، بدون RNG).
const SCALE = [220, 246.94, 277.18, 329.63, 369.99, 440, 493.88, 554.37];
const STEPS = [1, 2, 4, 1, 3, 2, 4];

export function createSoundManager(o) {
  const opts = o || {};
  const volumes = loadVolumes();
  const mgr = {
    volumes,
    started: false,
    log: [], // تازه‌ترین kindها برای پروب E2E (فقط سمت رندر)
    _ctx: null,
    _master: null,
    _musicBus: null,
    _sfxBus: null,
    _step: 0,
    _scaleIdx: 0,
    _nextPluckAt: 0,
    _shuffle: null,

    // باید از ژست کاربر صدا زده شود (سیاست autoplay). ایدم‌پوتنت.
    ensureStarted() {
      if (this.started) {
        if (this._ctx && this._ctx.state === "suspended") this._ctx.resume();
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
      this._master.connect(ctx.destination);
      this._musicBus = ctx.createGain();
      this._musicBus.gain.value = volumes.music * 0.5;
      this._musicBus.connect(this._master);
      this._sfxBus = ctx.createGain();
      this._sfxBus.gain.value = volumes.sfx;
      this._sfxBus.connect(this._master);
      this._startWind();
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
      if (this._master) this._master.gain.value = volumes.muted ? 0 : 1;
      saveVolumes(volumes);
    },

    // بازخورد ژست UI (دستور/ساخت/تأیید، رد).
    ack(kind) {
      if (!this.started) return;
      if (kind === "deny") this._tone(160, 0.12, "square", 0.25);
      else this._tone(kind === "order" ? 660 : 880, 0.06, "sine", 0.2);
    },

    // جفت اسنپ‌شات → رویدادهای سنتزشده. صدازدن پیش از شروع امن است (می‌ریزد).
    update(prev, curr) {
      if (!this.started) return [];
      const events = diffSoundEvents(prev, curr);
      for (const e of events) this._play(e);
      this.log.push(...events.map((e) => e.kind));
      if (this.log.length > 50) this.log.splice(0, this.log.length - 50);
      this._musicTick();
      this._shuffleTick(countWalking(prev, curr));
      return events;
    },

    _play(e) {
      switch (e.kind) {
        case "placed":
          this._tone(180, 0.09, "square", 0.22, 90);
          break;
        case "completed":
          this._tone(660, 0.14, "sine", 0.25);
          this._toneAt(880, 0.2, "sine", 0.25, 0.12);
          break;
        case "razed":
          this._noise(0.4, 400, 0.3);
          break;
        case "strike":
          this._tone(220, 0.1, "square", 0.16);
          this._tone(331, 0.08, "square", 0.1);
          break;
        case "death":
          this._tone(300, 0.25, "sine", 0.3, 80);
          break;
        case "victory":
          if (e.outcome === "victory") {
            [523, 659, 784, 1046].forEach((f, i) => this._toneAt(f, 0.25, "triangle", 0.3, i * 0.16));
          } else {
            [392, 311, 262, 196].forEach((f, i) => this._toneAt(f, 0.3, "triangle", 0.3, i * 0.2));
          }
          break;
        default:
          break;
      }
    },

    _tone(freq, dur, type, vol, slideTo) {
      this._toneAt(freq, dur, type, vol, 0, slideTo);
    },

    _toneAt(freq, dur, type, vol, delay, slideTo) {
      const ctx = this._ctx;
      if (!ctx) return;
      const t0 = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g);
      g.connect(this._sfxBus);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },

    _noise(dur, cutoff, vol) {
      const ctx = this._ctx;
      if (!ctx) return;
      const t0 = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      // نویز شبه‌قطعی (بدون Math.random، خروجی پایدار).
      let seed = 123456789;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        data[i] = (seed / 0x3fffffff - 1) * 0.8;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = cutoff;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(filt);
      filt.connect(g);
      g.connect(this._sfxBus);
      src.start(t0);
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

    _musicTick() {
      const ctx = this._ctx;
      if (!ctx) return;
      if (ctx.currentTime < this._nextPluckAt) return;
      const f = SCALE[this._scaleIdx % SCALE.length];
      this._scaleIdx = (this._scaleIdx + STEPS[this._step % STEPS.length]) % SCALE.length;
      this._step += 1;
      this._nextPluckAt = ctx.currentTime + 2.4;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.0);
      osc.connect(g);
      g.connect(this._musicBus);
      osc.start(t0);
      osc.stop(t0 + 2.1);
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
