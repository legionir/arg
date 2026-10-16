// ذخیره ابری (0.67.0 — انتخاب ۳-الف کاربر): ادامه بازی روی چند دستگاه.
import { lazyTable } from "./lazy.js";
import { getSocketMaker } from "./selfhost.js"; // بک‌اند: اول پلتفرم، وگرنه سرور شخصی (0.69.0)
//
// قرارداد:
// - کلید هر اسلات = عبارت ۴..۳۲ نویسه‌ای کاربر؛ فقط هش FNV-1a آن (هگز
//   ۸نویسه‌ای) به سرور می‌رود — سرور عبارت را هرگز نمی‌بیند. هر کس عبارت را
//   بداند می‌خواند/می‌نویسد (امنیت در حد «رمز اتاق»، نه حساب کاربری).
// - داده همان JSON ذخیره محلی است (serializeJSON)؛ سقف ۳۲۷۶۸ نویسه (آینه
//   سرور) — بیشتر = خطای تمیز TOO_BIG، نه برش خاموش.
// - آفلاین/خطا = فقط همین کنش؛ تک‌نفره ادامه دارد (الگوی online.js).
export const CLOUD_KEY_MIN = 4;
export const CLOUD_KEY_MAX = 32;
export const CLOUD_DATA_MAX = 32768; // سقف نویسه داده (آینه CLOUD_CHARS سرور)
export const CLOUD_STORE_KEY = "scw.cloudkey";

export const CLOUD_FA = lazyTable({
  BAD_KEY: "system.cloud.BAD_KEY",
  TOO_BIG: "system.cloud.TOO_BIG",
  EMPTY: "system.cloud.EMPTY",
  FULL: "system.cloud.FULL",
  OFFLINE: "system.cloud.OFFLINE",
  SLOW: "system.cloud.SLOW",
  KEY: "system.cloud.KEY",
  BIG: "system.cloud.BIG",
  BAD: "system.cloud.BAD",
  // کدهای سرور حروف‌کوچک‌اند (slow/bad/key/big/full/empty) — نگاشت مستقیم به همان پیام‌ها.
  slow: "system.cloud.SLOW",
  key: "system.cloud.KEY",
  big: "system.cloud.BIG",
  bad: "system.cloud.BAD",
  full: "system.cloud.FULL",
  empty: "system.cloud.EMPTY",
});

// هش FNV-1a روی واحدهای UTF-16 (آینه clKeyH سرور) — خالص و تست‌پذیر.
export function cloudKeyHash(pass) {
  let h = 2166136261 >>> 0;
  const s = String(pass);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 65535;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ("0000000" + (h >>> 0).toString(16)).slice(-8);
}

export function validCloudKey(pass) {
  if (typeof pass !== "string") return false;
  const t = pass.trim();
  return t.length >= CLOUD_KEY_MIN && t.length <= CLOUD_KEY_MAX;
}

export function initCloud() {
  const api = {
    ready: false,
    _sock() { return sock; },
    async save(pass, json) {
      if (!validCloudKey(pass)) return { ok: false, error: "BAD_KEY" };
      if (typeof json !== "string" || json.length > CLOUD_DATA_MAX) {
        return { ok: false, error: "TOO_BIG" };
      }
      const s = await needSock();
      if (!s) return { ok: false, error: "OFFLINE" };
      try {
        const raw = await s.rpc.cloudSave(JSON.stringify({ k: cloudKeyHash(pass.trim()), data: json }));
        const r = JSON.parse(raw);
        return r.ok ? { ok: true, at: r.data.at } : { ok: false, error: r.err || "BAD" };
      } catch (e) { return { ok: false, error: "OFFLINE" }; }
    },
    async load(pass) {
      if (!validCloudKey(pass)) return { ok: false, error: "BAD_KEY" };
      const s = await needSock();
      if (!s) return { ok: false, error: "OFFLINE" };
      try {
        const raw = await s.rpc.cloudLoad(JSON.stringify({ k: cloudKeyHash(pass.trim()) }));
        const r = JSON.parse(raw);
        return r.ok ? { ok: true, text: r.data.data, at: r.data.at } : { ok: false, error: r.err || "BAD" };
      } catch (e) { return { ok: false, error: "OFFLINE" }; }
    },
    async del(pass) {
      if (!validCloudKey(pass)) return { ok: false, error: "BAD_KEY" };
      const s = await needSock();
      if (!s) return { ok: false, error: "OFFLINE" };
      try {
        const raw = await s.rpc.cloudDelete(JSON.stringify({ k: cloudKeyHash(pass.trim()) }));
        const r = JSON.parse(raw);
        return r.ok ? { ok: true } : { ok: false, error: r.err || "BAD" };
      } catch (e) { return { ok: false, error: "OFFLINE" }; }
    },
  };

  let sock = null, backoff = 1000, seq = 0;
  function needSock() {
    if (sock && api.ready) return Promise.resolve(sock);
    if (!sock) connect();
    return new Promise((resolve) => {
      let n = 0;
      const t = setInterval(() => {
        if (sock && api.ready) { clearInterval(t); resolve(sock); }
        else if (++n > 30) { clearInterval(t); resolve(null); }
      }, 200);
    });
  }
  function connect() {
    const make = getSocketMaker(); // اول پلتفرم، وگرنه سرور شخصی (0.69.0)
    if (typeof make !== "function") return; // هیچ بک‌اندی نیست — آفلاینِ کامل
    const mySeq = ++seq;
    let s = null;
    try { s = make(); } catch (e) { schedule(); return; }
    sock = s;
    s.addEventListener("open", () => {
      if (mySeq !== seq) { try { s.close(); } catch (e) {} return; }
      backoff = 1000;
      api.ready = true;
    });
    s.addEventListener("close", (ev) => {
      if (mySeq !== seq) return;
      api.ready = false;
      sock = null;
      const code = ev && ev.code;
      if (code === 4403 || code === 4429) return;
      schedule();
    });
  }
  function schedule() {
    const wait = backoff + Math.random() * 1000;
    backoff = Math.min(30000, backoff * 2);
    setTimeout(() => { if (!api.ready) connect(); }, wait);
  }
  connect();
  return api;
}
