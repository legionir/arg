// بک‌اند IndexedDB (0.55.0 — #۱۶ از FEATURES، الگوی CHG-020/034 مرجع).
// ذخیره‌های بازی (اسلات‌های auto/manual) به‌جای localStorage این‌جا می‌روند:
// ناهمگام، سهمیه بزرگ‌تر، بدون مسدودکردن ریسه اصلی. بدون import تا در boot،
// تست هدلس و هر ابزار دیگری امن باشد.
// قرارداد: همه تابع‌ها Promise برمی‌گردانند با {ok:true,...} یا
// {ok:false, error} — خطاها: EMPTY (کلید نیست)، TOO_BIG (بیش از سقف ۴MB)،
// DISABLED (مرورگر ندارد/بسته است). هیچ‌وقت throw نمی‌کنند.

export const IDB_DB = "scw-db";
export const IDB_STORE = "kv";
// سقف هر مقدار: ۴MB بایت (UTF-8 واقعی، نه طول رشته — نام فارسی در ذخیره هست).
export const IDB_CAP = 4 * 1024 * 1024;

export function idbAvailable() {
  try {
    return typeof indexedDB !== "undefined" && !!indexedDB;
  } catch {
    return false;
  }
}

function byteLen(text) {
  try {
    return new Blob([text]).size;
  } catch {
    return String(text).length * 2; // تقریب محافظه‌کارانه
  }
}

let openP = null;
function openDb() {
  if (!idbAvailable()) return Promise.reject(new Error("DISABLED"));
  if (!openP) {
    openP = new Promise((resolve, reject) => {
      let req;
      try {
        req = indexedDB.open(IDB_DB, 1);
      } catch (e) {
        reject(e);
        return;
      }
      req.onupgradeneeded = () => {
        try {
          req.result.createObjectStore(IDB_STORE);
        } catch (e) { /* از قبل هست */ }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("open failed"));
      req.onblocked = () => reject(new Error("blocked"));
    }).catch((e) => {
      openP = null; // باز بعدی دوباره تلاش می‌کند
      throw e;
    });
  }
  return openP;
}

function reqP(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("request failed"));
  });
}

function withStore(mode, fn) {
  return openDb().then((db) => {
    const t = db.transaction(IDB_STORE, mode);
    const out = fn(t.objectStore(IDB_STORE));
    return Promise.resolve(out).then(
      (v) => new Promise((resolve, reject) => {
        t.oncomplete = () => resolve(v);
        t.onerror = () => reject(t.error || new Error("tx failed"));
        t.onabort = () => reject(t.error || new Error("tx aborted"));
      }),
    );
  });
}

export function idbSet(key, text) {
  if (!idbAvailable()) return Promise.resolve({ ok: false, error: "DISABLED" });
  const s = typeof text === "string" ? text : String(text);
  if (byteLen(s) > IDB_CAP) return Promise.resolve({ ok: false, error: "TOO_BIG" });
  return withStore("readwrite", (st) => reqP(st.put(s, key))).then(
    () => ({ ok: true, bytes: s.length }),
    () => ({ ok: false, error: "DISABLED" }),
  );
}

export function idbGet(key) {
  if (!idbAvailable()) return Promise.resolve({ ok: false, error: "DISABLED" });
  return withStore("readonly", (st) => reqP(st.get(key))).then(
    (v) => (v === undefined || v === null || typeof v !== "string"
      ? { ok: false, error: "EMPTY" }
      : { ok: true, text: v }),
    () => ({ ok: false, error: "DISABLED" }),
  );
}

export function idbDel(key) {
  if (!idbAvailable()) return Promise.resolve({ ok: false, error: "DISABLED" });
  return withStore("readwrite", (st) => reqP(st.delete(key))).then(
    () => ({ ok: true }),
    () => ({ ok: false, error: "DISABLED" }),
  );
}
