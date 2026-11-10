// ZIP writer/reader حداقلی (stored، بی‌فشرده‌سازی) — 0.232.0 C-SRV-4.
// خالص و بدون ایمپورت: هم در Node (make-bundle.mjs) و هم در هارنس مرورگری
// (execute_js) یکسان اجرا می‌شود. نام‌ها UTF-8؛ زمان ثابت (بیلد قطعی).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder("utf-8").decode(b);

function writer() {
  const parts = [];
  let len = 0;
  return {
    u32(v) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v >>> 0, true); parts.push(b); len += 4; },
    u16(v) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v & 65535, true); parts.push(b); len += 2; },
    raw(b) { parts.push(b); len += b.length; },
    get size() { return len; },
    done() {
      const out = new Uint8Array(len);
      let o = 0;
      for (const p of parts) { out.set(p, o); o += p.length; }
      return out;
    },
  };
}

// files: [{name, data: Uint8Array}] — نام تکراری/خالی/«..» رد می‌شود.
export function zipStore(files) {
  if (!Array.isArray(files) || files.length === 0) throw new Error("zip: empty file list");
  const seen = new Set();
  const central = writer();
  const out = writer();
  let count = 0;
  for (const f of files) {
    if (!f || typeof f.name !== "string" || !(f.data instanceof Uint8Array)) throw new Error("zip: bad entry");
    const nb = enc(f.name);
    if (nb.length === 0 || nb.length > 65535) throw new Error("zip: bad name length");
    if (f.name.includes("..") || f.name.startsWith("/") || seen.has(f.name)) throw new Error("zip: bad name " + f.name);
    seen.add(f.name);
    const crc = crc32(f.data), n = f.data.length;
    const off = out.size;
    out.u32(0x04034B50); out.u16(20); out.u16(0x0800); out.u16(0); out.u16(0); out.u16(0x0021);
    out.u32(crc); out.u32(n); out.u32(n); out.u16(nb.length); out.u16(0);
    out.raw(nb); out.raw(f.data);
    central.u32(0x02014B50); central.u16(20); central.u16(20); central.u16(0x0800);
    central.u16(0); central.u16(0); central.u16(0x0021);
    central.u32(crc); central.u32(n); central.u32(n);
    central.u16(nb.length); central.u16(0); central.u16(0);
    central.u16(0); central.u16(0); central.u32(0); central.u32(off);
    central.raw(nb);
    count++;
  }
  const cdir = central.done();
  const coff = out.size;
  out.raw(cdir);
  out.u32(0x06054B50); out.u16(0); out.u16(0); out.u16(count); out.u16(count);
  out.u32(cdir.length); out.u32(coff); out.u16(0);
  return out.done();
}

function reader(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  return {
    u32(o) { return dv.getUint32(o, true); },
    u16(o) { return dv.getUint16(o, true); },
    slice(o, n) { return buf.slice(o, o + n); },
  };
}

// بازخوانی + راستی‌آزمایی CRC/اندازه؛ خرابی = throw. خروجی [{name, data}].
export function zipParse(buf) {
  if (!(buf instanceof Uint8Array) || buf.length < 22) throw new Error("zip: too small");
  const r = reader(buf);
  const eocd = buf.length - 22;
  if (r.u32(eocd) !== 0x06054B50) throw new Error("zip: no EOCD");
  const count = r.u16(eocd + 10), csize = r.u32(eocd + 12), coff = r.u32(eocd + 16);
  if (coff + csize > eocd) throw new Error("zip: bad central dir");
  const files = [];
  let p = coff;
  for (let i = 0; i < count; i++) {
    if (r.u32(p) !== 0x02014B50) throw new Error("zip: bad central entry " + i);
    const method = r.u16(p + 10), crc = r.u32(p + 16), comp = r.u32(p + 20), uncomp = r.u32(p + 24);
    const nl = r.u16(p + 28), el = r.u16(p + 30), cl = r.u16(p + 32), off = r.u32(p + 42);
    if (method !== 0) throw new Error("zip: unsupported method");
    const name = dec(r.slice(p + 46, nl));
    const lh = off;
    if (r.u32(lh) !== 0x04034B50) throw new Error("zip: bad local header " + i);
    const lnl = r.u16(lh + 26), lel = r.u16(lh + 28);
    const data = r.slice(lh + 30 + lnl + lel, comp);
    if (data.length !== comp || comp !== uncomp) throw new Error("zip: size mismatch " + name);
    if (crc32(data) !== crc) throw new Error("zip: crc mismatch " + name);
    files.push({ name, data: data.slice() });
    p += 46 + nl + el + cl;
  }
  return files;
}
