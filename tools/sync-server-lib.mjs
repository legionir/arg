// ابزار همگام‌سازی آینه‌های سرور (0.231.0 — C-SRV-3). خالص، بدون ایمپورت:
// هم در Node (sync-server.mjs) و هم در هارنس مرورگری (execute_js) یکسان اجرا می‌شود.
export const PLUGIN_OPEN = '<script type="text/x-server-plugin">';
export const MIRROR_BEGIN = "<!-- MIRROR-SERVER-BEGIN";
export const MIRROR_END = "<!-- MIRROR-SERVER-END -->";

export function toLF(t) { return String(t).replace(/\r\n/g, "\n"); }

// استخراج بلوک سرور از src/arg/index.html: {block, startLine, endLine}.
// block = متن عینی بین خط بازکن و </script> (بدون شکست انتهایی)؛ شماره خط‌ها ۱-مبنا.
export function extractBlock(srcRaw) {
  const src = String(srcRaw);
  const oi = src.indexOf(PLUGIN_OPEN);
  if (oi < 0) throw new Error("plugin block not found");
  let cs = src.indexOf("\n", oi);
  if (cs < 0) throw new Error("bad plugin open");
  cs += 1;
  const ce = src.indexOf("</script>", cs);
  if (ce < 0) throw new Error("plugin close not found");
  let block = src.slice(cs, ce);
  block = block.replace(/(\r\n|\n|\r)$/, "");
  const startLine = (src.slice(0, cs).match(/\n/g) || []).length + 1;
  const endLine = startLine + block.split("\n").length - 1;
  return { block, startLine, endLine };
}

export function gameLogicHeader(meta) {
  const L = [
    "// منطق سرور بازی (ارگ) — ساخته tools/sync-server.mjs؛ دستی ویرایش نکن.",
    "// منبع حقیقت: " + meta.srcPath + "، <script type=\"text/x-server-plugin\"> (خطوط " + meta.startLine + " تا " + meta.endLine + ").",
    "// عینی‌بودن = رفتار سرور شخصی و پرچنس یکسان است.",
    "//",
    "// بارگذاری: این فایل مستقیم import نمی‌شود؛ server.mjs آن را به‌صورت متن",
    "// می‌خواند و با (new Function(\"state\",\"pubsub\",\"self\", code) اجرا می‌کند —",
    "// دقیقاً همان سه متغیری که پلاگین سرور پرچنس در اختیار اسکریپت می‌گذارد:",
    "//   state  : بایت‌آرایه دائمی (بافر باینری تالار + اتاق‌ها + ابری)",
    "//   pubsub : { publish(topic,msg), numSubscribers(topic) }",
    "//   self   : { onopen/onclose/onmessage, rpc } (این فایل پرش می‌کند)",
    "//",
    "// اندازه بافر موردنیاز: " + meta.stateSize + " بایت",
    "//   = 1056216 (تالار+اتاق‌ها+ابری+توکن‌ها+فرااتاق) + 32*524288 (لاگ ورودی)",
  ];
  return L.join("\r\n");
}

// game-logic.js: سربرگ + بلوک عینی (هر دو CRLF، پایان فایل یک CRLF).
export function buildGameLogic(blockCRLF, meta) {
  return gameLogicHeader(meta) + "\r\n" + blockCRLF + "\r\n";
}

// ریشه index.html (LF): جایگزینی ناحیه بین نشانگرها با بلوک LFشده.
export function buildRootDoc(rootRaw, blockCRLF) {
  const root = toLF(rootRaw);
  const blockLF = toLF(blockCRLF);
  const bi = root.indexOf(MIRROR_BEGIN);
  if (bi < 0) throw new Error("root begin marker not found");
  const ei = root.indexOf(MIRROR_END, bi);
  if (ei < 0) throw new Error("root end marker not found");
  const openEnd = root.indexOf("\n", bi);
  if (openEnd < 0 || openEnd > ei) throw new Error("root begin marker has no end of line");
  const head = root.slice(0, openEnd + 1);
  const tail = root.slice(ei);
  return head + PLUGIN_OPEN + "\n" + blockLF + "\n</script>\n" + tail;
}

// مقایسه هر سه فایل؛ خروجی {ok, problems[], meta}.
export function checkMirrors(srcRaw, rootRaw, gameLogicRaw) {
  let ext;
  try {
    ext = extractBlock(srcRaw);
  } catch (e) {
    return { ok: false, problems: ["extract: " + (e && e.message)], meta: null };
  }
  const meta = { srcPath: "index.html", startLine: ext.startLine, endLine: ext.endLine, stateSize: 17833432 };
  const problems = [];
  if (buildGameLogic(ext.block, meta) !== String(gameLogicRaw)) problems.push("game-logic.js differs");
  // آینه ریشه فقط در چیدمان میزبانیِ دولایه وجود دارد؛ در مخزن مستقل rootRaw = null است.
  if (rootRaw != null && buildRootDoc(rootRaw, ext.block) !== toLF(rootRaw)) problems.push("root index.html mirror differs");
  return { ok: problems.length === 0, problems, meta };
}
