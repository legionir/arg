// کتابخانه خالص اسکن i18n (0.233.0 — C-TST-1): استخراج کلید/مقدار از سورس
// فایل واژگان (game/lang/*.js) + مقایسه fa/en. بدون IO، بدون DOM —
// هم در سوئیت (tests.js) هم در CLI (tools/i18n-scan.mjs) استفاده می‌شود.
// قرارداد: fa مرجع است؛ هر کلید fa باید en داشته باشد (به‌جز allowlist
// جمع‌های .one که فارسی عمداً فقط .other دارد و t() به .other سقوط می‌کند).

// استخراج {keys, values, dups} از بلوک یک زبان در سورس. ردیابی آکولاد +
// همه تطابق‌های "k": "v" هر خط (کلیدها ممکن است چندتا در یک خط باشند).
export function scanLangBlock(src, lang) {
  const lines = String(src).split("\n");
  let cur = null, depth = 0;
  const keys = [], values = Object.create(null);
  for (const ln of lines) {
    const t = ln.trim();
    if (/^fa\s*:\s*\{\s*$/.test(t)) { cur = "fa"; depth = 1; continue; }
    if (/^en\s*:\s*\{\s*$/.test(t)) { cur = "en"; depth = 1; continue; }
    if (cur === lang) {
      const re = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let m;
      while ((m = re.exec(ln))) { keys.push(m[1]); values[m[1]] = m[2]; }
      for (const ch of ln) { if (ch === "{") depth += 1; if (ch === "}") depth -= 1; }
      if (depth <= 0) cur = null;
    }
  }
  const seen = new Set(), dups = [];
  for (const k of keys) { if (seen.has(k)) { if (!dups.includes(k)) dups.push(k); } else seen.add(k); }
  return { keys, values, dups };
}

function phSet(s) {
  const m = String(s == null ? "" : s).match(/\{(\w+)\}/g) || [];
  return [...new Set(m)].sort().join(",");
}

// مقایسه یک جفت fa/en. allowExtraEn = کلیدهای en که نبودشان در fa عیب نیست
// (جمع‌های .one انحصاری انگلیسی). برمی‌گرداند {missEn, extraEn, dups, phMiss}.
export function scanLangPair(faSrc, enSrc, allowExtraEn) {
  const fa = scanLangBlock(faSrc, "fa"), en = scanLangBlock(enSrc, "en");
  const enSet = new Set(en.keys);
  const allow = new Set(Array.isArray(allowExtraEn) ? allowExtraEn : []);
  const missEn = fa.keys.filter((k, i) => fa.keys.indexOf(k) === i && !enSet.has(k));
  const faSet = new Set(fa.keys);
  const extraEn = en.keys.filter((k, i) => en.keys.indexOf(k) === i && !faSet.has(k) && !allow.has(k));
  const dups = [...new Set([...fa.dups, ...en.dups])];
  const phMiss = [];
  for (const k of faSet) {
    if (!enSet.has(k)) continue;
    const a = phSet(fa.values[k]), b = phSet(en.values[k]);
    if (a !== b) phMiss.push(k + " fa{" + (a || "-") + "} en{" + (b || "-") + "}");
  }
  return { missEn, extraEn, dups, phMiss, faCount: fa.keys.length, enCount: en.keys.length };
}

// کلیدهای en که نبودشان در fa پذیرفته است (جمع انگلیسی؛ فارسی فقط .other دارد
// و t() با withLang به .other سقوط می‌کند — قرارداد i18n.js).
export const I18N_ALLOW_EXTRA_EN = [
  "system.lobby.players.one",
  "system.online.hallRow.one",
  "system.online.count.one",
];
