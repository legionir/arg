// سوئیت فاز ۶ (0.235.0 — C-CLN-1): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
// چرخه import با ../tests.js عمدی و امن است: must/fresh/mpFresh/srvMake/srvRoom/srvInp فقط در
// زمان اجرای تست صدا زده می‌شوند (function/const زمان‌اجرا)، نه در ارزیابی ماژول.
import { CONFIG } from "../config.js";
import { t, withLang, getDir, isRTL, missingKeys, dictSize } from "../i18n.js";
import { serializeJSON, deserialize, migrateSaveDoc, MIGRATIONS, SCHEMA_VERSION } from "../persist.js";
import { stepEconomy, TAX, RATIONS } from "../economy.js";
import { TAX_IDS, RATION_IDS } from "../data.js";
import { tryPlace, validate } from "../construction.js";
import { stepCombat } from "../combat.js";
import { stepTraining } from "../train.js";
import { benchSim } from "../bench.js";
import { MOBILE_BENCH_TICKS, benchMobile } from "../bench.js";
import { spriteInlineCount, spriteCacheSize, getSprite } from "../sprites.js";
import { ICON_DATA } from "../icons.gen.js";
import { UNIT_DATA } from "../units.gen.js";
import { INPUT_DELAY, stateHash, updateMpAlive } from "../mp.js";
import { REFSCENE, refSceneCommands, refSceneChecksum, fnv1aHex } from "../../tools/refscene-lib.mjs";
import { fuzzSchedule, findGaps, countDups } from "../../tools/netfuzz-lib.mjs";
import { must, fresh, mpFresh, srvMake, srvRoom, srvInp } from "./fixtures.js";

// --- فاز ۶ تست‌ها (0.233.0): اسکن i18n + زنجیره مهاجرت + بنچ موبایل ---
// ردیف C-TST-1: واژگان کامل‌اند — هر کلید fa در en هست
// (تکراری fa خط ۲۸ game.js با متن انگلیسی حذف + en جامانده افزوده شد)
// + جهت RTL/LTR + برابری placeholder. خالص (ابزار tools/i18n-scan همان را روی سورس می‌زند).
function t_tst_i18n() {
  const miss = missingKeys("en");
  must(Array.isArray(miss) && miss.length === 0, "کلید fa بی en نباید باشد (" + miss.slice(0, 3).join(",") + ")");
  must(dictSize("fa") > 900 && dictSize("en") > 900, "واژگان باید پر باشد (fa=" + dictSize("fa") + " en=" + dictSize("en") + ")");
  must(withLang("fa", () => t("game.personality.arabLord.desc")).includes("لشکر"), "fa باید فارسی باشد");
  must(withLang("en", () => t("game.personality.arabLord.desc")).includes("Arabian"), "en باید ترجمه باشد");
  withLang("fa", () => { must(getDir() === "rtl" && isRTL() === true, "fa باید rtl باشد"); });
  withLang("en", () => { must(getDir() === "ltr" && isRTL() === false, "en باید ltr باشد"); });
  for (const lang of ["fa", "en"]) {
    const s = withLang(lang, () => t("ui.save.namedSaved", { name: "X", tick: 7 }));
    must(s.includes("X") && s.includes("7"), lang + " باید placeholder داشته باشد");
  }
  return { name: "اسکن i18n (C-TST-1)", pass: true, detail: "بی‌گم + rtl/ltr + placeholder" };
}
// ردیف C-TST-2: زنجیره مهاجرت نسخه‌به‌نسخه — ارتقای v1→v2
// صریح، idempotent، رد v0/آینده، برابری با deserialize مستقیم.
function t_tst_save_migrate() {
  must(typeof MIGRATIONS[1] === "function", "گام v1→v2 باید باشد");
  const { state } = fresh();
  const v1 = { ...JSON.parse(serializeJSON(state)), v: 1 };
  delete v1.units; delete v1.nextUnitId; delete v1.wave;
  for (const b of v1.buildings) delete b.hp;
  const r = migrateSaveDoc(v1);
  must(r.from === 1 && r.to === SCHEMA_VERSION && r.doc.v === 2, "ارتقا ۱→۲");
  must(Array.isArray(r.doc.units) && r.doc.units.length === 0, "یگان‌ها تهی می‌شوند");
  must(r.doc.nextUnitId === 1 && r.doc.wave === 0, "پیش‌فرض‌ها صریح می‌شوند");
  must(v1.v === 1 && v1.units === undefined, "ورودی لمس نمی‌شود");
  const viaChain = deserialize(r.doc), viaDirect = deserialize(JSON.parse(JSON.stringify(v1)));
  must(viaChain.units.length === 0 && viaDirect.units.length === 0, "هر دو بار می‌شوند");
  must(stateHash(viaChain) === stateHash(viaDirect), "هش زنجیره = مستقیم");
  const cur2 = JSON.parse(serializeJSON(state));
  const idem = migrateSaveDoc(cur2);
  must(idem.from === 2 && idem.to === 2 && JSON.stringify(idem.doc) === JSON.stringify(cur2), "v2 بی‌تغییر می‌ماند");
  for (const [doc, code] of [[{ v: 0 }, "UNSUPPORTED_VERSION"], [{ v: 99 }, "FUTURE_VERSION"], [null, "INVALID_SCHEMA"]]) {
    let got = "";
    try { migrateSaveDoc(doc); } catch (e) { got = e && e.code; }
    must(got === code, "رد " + JSON.stringify(doc && doc.v) + " = " + code);
  }
  return { name: "زنجیره مهاجرت (C-TST-2)", pass: true, detail: "v1→v2 + برابری + ردها" };
}
// ردیف C-TST-3: بودجه موبایل واقعی + کران نشت کش اسپرایت —
// benchMobile در بودجه، قطعی، get مکرر کش را رشد نمی‌دهد.
function t_tst_bench_mobile() {
  must(MOBILE_BENCH_TICKS === 120, "نمونه موبایل ۱۲۰ تیک است");
  const m = benchMobile();
  must(m.ticks === 120 && m.ok === true, "بنچ موبایل در بودجه است (" + m.sample.tickMs.toFixed(2) + "ms)");
  const a = benchSim(424242, 120), b = benchSim(424242, 120);
  must(a.hash === b.hash, "بنچ موبایل قطعی است");
  must(spriteInlineCount() >= 20, "جدول inline لود است (" + spriteInlineCount() + ")");
  const keys = Object.keys(UNIT_DATA);
  must(keys.length > 0, "یونیت‌دیتا باید کلید داشته باشد");
  const known = "assets/units/" + keys[0] + ".png";
  getSprite(known);
  const before = spriteCacheSize();
  for (let i = 0; i < 30; i++) getSprite(known);
  must(spriteCacheSize() === before, "تکرار کش را رشد نمی‌دهد");
  getSprite("assets/units/__tst_nope__.png");
  const afterMiss = spriteCacheSize();
  getSprite("assets/units/__tst_nope__.png");
  must(spriteCacheSize() === afterMiss && afterMiss <= before + 1, "آدرس ناموجود سقف‌دار است");
  must(spriteCacheSize() <= spriteInlineCount() + 64, "کران کش (" + spriteCacheSize() + ")");
  return { name: "بنچ موبایل (C-TST-3)", pass: true, detail: "بودجه + قطعیت + کش" };
}
// --- فاز ۶ تست‌ها (0.234.0): رگرسیون تصویری + همگامی ۴نفره + فازینگ ---
// ردیف C-TST-4: صحنه مرجع قطعی — هش فرمان‌ها + هش بایت‌های آیکون‌ها پین است.
// هش پیکسل (رندر OffscreenCanvas همین فرمان‌ها + ICON_DATA، در execute_js) در
// data/ref-scene.json است و هر نسخه تأیید می‌شود (read_image این محیط سیاه است).
const REFSCENE_EXPECTED = { cmds: 96, cmdHash: "36b695b8", iconHash: "865efccf", icons: 15 };
function t_tst_refscene() {
  const keys = Object.keys(ICON_DATA).sort();
  must(keys.length === REFSCENE_EXPECTED.icons, "۱۵ آیکون باید باشد (" + keys.length + ")");
  must(keys.indexOf("wood") >= 0 && keys.indexOf("meat") >= 0, "کلیدهای مرجع هست");
  const cmds = refSceneCommands(REFSCENE.seed, keys);
  must(cmds.length === REFSCENE_EXPECTED.cmds, "۹۶ فرمان باید باشد (" + cmds.length + ")");
  const h = refSceneChecksum(cmds);
  must(h === REFSCENE_EXPECTED.cmdHash, "هش صحنه باید پین بماند (" + h + ")");
  must(cmds[0].k === "bg", "فرمان اول پس‌زمینه است");
  const cnt = (k) => cmds.filter((c) => c.k === k).length;
  must(cnt("rect") === REFSCENE.nRect && cnt("circ") === REFSCENE.nCirc && cnt("line") === REFSCENE.nLine, "شمار شکل‌ها درست است");
  must(cnt("icon") === keys.length, "هر آیکون یک کاشی دارد");
  const cols = Math.max(1, ((REFSCENE.w - REFSCENE.ox * 2 + REFSCENE.gap) / (REFSCENE.icon + REFSCENE.gap)) | 0);
  for (const c of cmds) {
    if (c.k !== "icon") continue;
    must(c.col >= 0 && c.col < cols && c.row >= 0, "کاشی در گرید است");
  }
  must(refSceneChecksum(refSceneCommands(REFSCENE.seed, keys)) === h, "بازسازی همان هش است (قطعی)");
  must(refSceneChecksum(refSceneCommands(REFSCENE.seed + 1, keys)) !== h, "seed دیگر هش دیگر می‌دهد");
  must(refSceneChecksum(refSceneCommands(REFSCENE.seed, keys.slice(0, 14))) !== h, "حذف آیکون هش را عوض می‌کند");
  must(fnv1aHex(keys.map((k) => ICON_DATA[k]).join("")) === REFSCENE_EXPECTED.iconHash, "بایت‌های آیکون‌ها پین است");
  must(fnv1aHex("") === "811c9dc5", "بردار FNV-1a (رشته تهی)");
  return { name: "صحنه مرجع (C-TST-4)", pass: true, detail: "۹۶ فرمان + ۱۵ آیکون" };
}
// اتاق ۴نفره واقعی از بلوک سرور همین صفحه (الگوی srvRoom، با ۴ اتصال).
function tstRoom4() {
  const s = srvMake();
  const conns = [s.mkConn(), s.mkConn(), s.mkConn(), s.mkConn()];
  const r0 = s.call(conns[0], "mpCreate", { name: "P1", max: 4 });
  must(r0.ok, "ساخت اتاق ۴نفره");
  const code = r0.data.code, toks = [r0.data.token];
  for (let i = 1; i < 4; i++) {
    const r = s.call(conns[i], "mpJoin", { code, name: "P" + (i + 1) });
    must(r.ok, "پیوستن " + (i + 1));
    toks.push(r.data.token);
  }
  for (let i = 0; i < 4; i++) must(s.call(conns[i], "mpReady", { code, ready: true }).ok, "آماده " + (i + 1));
  must(s.call(conns[0], "mpStart", { code }).ok, "شروع");
  return { s, conns, code, toks };
}
// صف کلاینت — آینه main.js onInput (رد seq تکراری/کهنه) + mpDrain (تخلیه ترتیبی
// با گیت exec = tick + INPUT_DELAY؛ ورودی بد نادیده، ترتیب حفظ می‌شود).
function tstMpClient() {
  return { pending: new Map(), next: 1, ignored: 0 };
}
function tstMpRecv(cli, m) {
  if (!m || typeof m.seq !== "number" || m.seq < 1) return;
  if (cli.pending.has(m.seq) || m.seq < cli.next) return;
  cli.pending.set(m.seq, m);
}
function tstMpApply(f, op) {
  const st = f.state;
  if (op.kind === "tax") {
    if (typeof op.args.v !== "string" || !TAX[op.args.v]) return false;
    st.mpres[op.slot].tax = op.args.v;
    return true;
  }
  if (op.kind === "rations") {
    if (typeof op.args.v !== "string" || !RATIONS[op.args.v]) return false;
    st.mpres[op.slot].rations = op.args.v;
    return true;
  }
  if (op.kind === "place") {
    const def = CONFIG.BUILDINGS[op.args.type];
    if (!def || def.key === "keep") return false;
    const r = tryPlace(st, f.terrain, f.W, f.H, op.args.c, op.args.r, def, op.slot);
    return r.ok;
  }
  return false;
}
function tstMpDrain(cli, f, tick) {
  for (;;) {
    const m = cli.pending.get(cli.next);
    if (!m) return;
    if (tick < ((m.tick | 0) + INPUT_DELAY)) return;
    cli.pending.delete(cli.next); cli.next++;
    let ok = false;
    try { ok = tstMpApply(f, m); } catch (e) { ok = false; }
    if (!ok) cli.ignored++;
  }
}
function tstMpStep(f) {
  f.state.tick++;
  stepEconomy(f.state); stepTraining(f.state, f.terrain); stepCombat(f.state, f.terrain); updateMpAlive(f.state);
}
// ردیف C-TST-5: همگامی ۴نفره — seq واقعی از سرور + ۴ sim مستقل + rejoin میانی.
// نوار اسکریپتی (tax/rations/place از هر ۴ اسلات) تا ۶۰۰ تیک؛ هش هر ۲۰۰ تیک برابر.
function t_tst_mp4() {
  const { s, conns, code, toks } = tstRoom4();
  const sims = [mpFresh(4), mpFresh(4), mpFresh(4), mpFresh(4)];
  for (let i = 0; i < 4; i++) {
    must(sims[i].state.mpres[i].resources.wood >= 6, "چوب آغازین اسلات " + i + " برای کلبه کافی است");
  }
  const proto = sims[0];
  const hutAt = [];
  for (let slot = 0; slot < 4; slot++) {
    const keep = proto.state.buildings.find((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === slot);
    must(!!keep, "ستاد اسلات " + slot + " هست");
    let spot = null;
    for (let rad = 1; rad < 10 && !spot; rad++) {
      for (let dr = -rad; dr <= rad && !spot; dr++) {
        for (let dc = -rad; dc <= rad && !spot; dc++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
          if (validate(proto.state, proto.terrain, proto.W, proto.H, keep.c + dc, keep.r + dr, CONFIG.BUILDINGS.hut, slot).ok) {
            spot = { c: keep.c + dc, r: keep.r + dr };
          }
        }
      }
    }
    must(!!spot, "جای کلبه اسلات " + slot + " هست");
    hutAt.push(spot);
  }
  const lastTax = "high", lastRat = RATION_IDS[RATION_IDS.length - 1]; // سقف سرور: طول v حداکثر ۱۶ نویسه است ("cruellerThanCruel" ۱۷تایی رد می‌شود)
  const tape = [
    { slot: 0, kind: "tax", args: { v: lastTax }, tick: 5 },
    { slot: 1, kind: "rations", args: { v: lastRat }, tick: 10 },
    { slot: 2, kind: "tax", args: { v: "low" }, tick: 15 },
    { slot: 3, kind: "place", args: { type: "hut", c: hutAt[3].c, r: hutAt[3].r }, tick: 20 },
    { slot: 0, kind: "place", args: { type: "hut", c: hutAt[0].c, r: hutAt[0].r }, tick: 40 },
    { slot: 1, kind: "tax", args: { v: "average" }, tick: 60 },
    { slot: 2, kind: "place", args: { type: "hut", c: hutAt[2].c, r: hutAt[2].r }, tick: 80 },
    { slot: 3, kind: "rations", args: { v: "double" }, tick: 100 },
    { slot: 0, kind: "rations", args: { v: "extra" }, tick: 150 },
    { slot: 1, kind: "place", args: { type: "hut", c: hutAt[1].c, r: hutAt[1].r }, tick: 200 },
  ];
  const seqd = [];
  let expectSeq = 1;
  for (const op of tape) {
    const r = srvInp(s, conns[op.slot], code, op.kind, op.args, op.tick);
    must(r.ok, "ورودی " + op.kind + "@" + op.tick + " پذیرفته می‌شود");
    must(r.data.seq === expectSeq, "seq پیاپی است (" + expectSeq + ")");
    expectSeq++;
    seqd.push({ seq: r.data.seq, slot: op.slot, kind: op.kind, args: op.args, tick: op.tick });
  }
  const clis = [tstMpClient(), tstMpClient(), tstMpClient(), tstMpClient()];
  for (const cli of clis) for (const m of seqd) tstMpRecv(cli, m);
  const snaps = [];
  for (let tick = 1; tick <= 600; tick++) {
    for (let i = 0; i < 4; i++) { tstMpDrain(clis[i], sims[i], tick); tstMpStep(sims[i]); }
    if (tick === 300) {
      const nc = s.mkConn();
      const rj = s.call(nc, "mpRejoin", { code, slot: 3, token: toks[3] });
      must(rj.ok, "rejoin میانی اسلات ۳");
      must(rj.data.seq === 11, "تداوم seq پس از rejoin (" + rj.data.seq + ")");
    }
    if (tick === 200 || tick === 400 || tick === 600) {
      const hs = sims.map((f) => stateHash(f.state));
      must(hs[0] === hs[1] && hs[1] === hs[2] && hs[2] === hs[3], "هش هر ۴ sim در تیک " + tick + " برابر است");
      snaps.push(hs[0].slice(0, 8));
    }
  }
  for (let i = 0; i < 4; i++) must(clis[i].ignored === 0, "هیچ ورودی در sim " + (i + 1) + " نادیده گرفته نشد");
  must(!sims[0].state.mp.over, "بازی نباید تمام شده باشد");
  const ref = mpFresh(4);
  for (let tick = 1; tick <= 600; tick++) {
    ref.state.tick++;
    for (const m of seqd) if ((m.tick + INPUT_DELAY) === tick) tstMpApply(ref, m);
    stepEconomy(ref.state); stepTraining(ref.state, ref.terrain); stepCombat(ref.state, ref.terrain); updateMpAlive(ref.state);
  }
  must(stateHash(ref.state) === stateHash(sims[0].state), "صف کلاینت انحراف نمی‌دهد");
  must(ref.state.mpres[0].tax === lastTax, "مالیات اسلات ۰ اعمال شد");
  must(ref.state.buildings.some((b) => b.type === "hut" && !b.destroyed && (b.owner | 0) === 3), "کلبه اسلات ۳ ساخته شد");
  return { name: "همگامی ۴نفره (C-TST-5)", pass: true, detail: "۱۰ ورودی + rejoin + " + snaps.join("/") };
}
// ردیف C-TST-6: فازینگ تحویل — واحد خالص lib + رفتار واقعی سرور +
// یکپارچگی lockstep زیر dup/reorder (همگرا) و stall قابل‌شناسایی زیر drop.
// (تصادف lib ابزار است، نه رفتار محصول: همه ادعاها قطعی‌به‌ساخت‌اند.)
function t_tst_netfuzz() {
  const msgs = []; for (let s = 1; s <= 20; s++) msgs.push({ seq: s });
  const straight = fuzzSchedule(msgs, { seed: 1 });
  must(straight.length === 20 && straight.every((e, i) => e.msg.seq === i + 1 && e.at === 0), "پروفایل تهی گذر مستقیم است");
  const allDup = fuzzSchedule(msgs, { seed: 3, dupP: 1 });
  must(allDup.length === 40 && countDups(allDup.map((e) => e.msg.seq)) === 20, "dupP=۱ همه را تکرار می‌کند");
  const allDrop = fuzzSchedule(msgs, { seed: 3, dropP: 1 });
  must(allDrop.length === 0, "dropP=۱ همه را می‌اندازد");
  const d1 = fuzzSchedule(msgs, { seed: 9, dropP: 0.2, dupP: 0.3, reorderWindow: 4, delayMax: 3 });
  const d2 = fuzzSchedule(msgs, { seed: 9, dropP: 0.2, dupP: 0.3, reorderWindow: 4, delayMax: 3 });
  must(JSON.stringify(d1) === JSON.stringify(d2), "زمان‌بندی با seed قطعی است");
  must(d1.every((e) => e.at >= 0 && e.at <= 2 * 3), "تأخیر در سقف است (تکرار تا delayMax دیرتر می‌رسد)");
  const multi = fuzzSchedule(msgs, { seed: 9, dropP: 0, dupP: 0.2, reorderWindow: 5, delayMax: 2 });
  const mseq = multi.map((e) => e.msg.seq).sort((a, b) => a - b);
  must(mseq.filter((x, i, a) => i === 0 || x !== a[i - 1]).join(",") === msgs.map((m) => m.seq).join(","), "بی‌drop هیچ seq گم نمی‌شود");
  must(JSON.stringify(findGaps([1, 2, 4, 6, 6, 7])) === "[3,5]", "شکاف‌ها دقیق‌اند");
  must(findGaps([3, 1, 2, 2]).length === 0 && countDups([3, 1, 2, 2]) === 1, "بی‌شکاف + یک تکرار");
  // سرور: دو ارسال هم‌محتوا = دو seq متمایز (mpInput محتوا را dedup نمی‌کند؛
  // dedup با seq سمت کلاینت است — آینه main.js onInput).
  const s = srvMake(); const rm = srvRoom(s, 2);
  const q1 = srvInp(s, rm.a, rm.code, "tax", { v: "high" }, 5);
  const q2 = srvInp(s, rm.a, rm.code, "tax", { v: "high" }, 5);
  must(q1.ok && q2.ok && q2.data.seq === q1.data.seq + 1, "ارسال تکراری seq تازه می‌گیرد");
  // یکپارچگی: dup+reorder (بی‌drop) هر ۴ sim را همگرا نگه می‌دارد.
  const { s: s4, conns: c4, code: code4 } = tstRoom4();
  const lastTax = "high", lastRat = RATION_IDS[RATION_IDS.length - 1]; // سقف سرور: طول v حداکثر ۱۶ نویسه است ("cruellerThanCruel" ۱۷تایی رد می‌شود)
  const tape = [
    { slot: 0, kind: "tax", args: { v: lastTax }, tick: 5 },
    { slot: 1, kind: "rations", args: { v: lastRat }, tick: 10 },
    { slot: 2, kind: "tax", args: { v: "low" }, tick: 15 },
    { slot: 3, kind: "rations", args: { v: "double" }, tick: 20 },
    { slot: 0, kind: "rations", args: { v: "extra" }, tick: 30 },
    { slot: 1, kind: "tax", args: { v: "average" }, tick: 40 },
  ];
  const seqd = [];
  for (const op of tape) {
    const r = srvInp(s4, c4[op.slot], code4, op.kind, op.args, op.tick);
    must(r.ok, "ورودی فاز " + op.kind + "@" + op.tick);
    seqd.push({ seq: r.data.seq, slot: op.slot, kind: op.kind, args: op.args, tick: op.tick });
  }
  const sims = [mpFresh(4), mpFresh(4), mpFresh(4), mpFresh(4)];
  const clis = [tstMpClient(), tstMpClient(), tstMpClient(), tstMpClient()];
  const scheds = [101, 102, 103, 104].map((seed) => fuzzSchedule(seqd, { seed, dropP: 0, dupP: 0.35, reorderWindow: 6, delayMax: 3 }));
  for (let tick = 1; tick <= 400; tick++) {
    for (let i = 0; i < 4; i++) {
      for (const e of scheds[i]) if (!e.sent && e.at <= tick) { e.sent = true; tstMpRecv(clis[i], e.msg); }
      tstMpDrain(clis[i], sims[i], tick); tstMpStep(sims[i]);
    }
  }
  const hs = sims.map((f) => stateHash(f.state));
  must(hs.every((x) => x === hs[0]), "زیر dup+reorder هر ۴ sim همگرایند");
  const ref = mpFresh(4);
  for (let tick = 1; tick <= 400; tick++) {
    ref.state.tick++;
    for (const m of seqd) if ((m.tick + INPUT_DELAY) === tick) tstMpApply(ref, m);
    stepEconomy(ref.state); stepTraining(ref.state, ref.terrain); stepCombat(ref.state, ref.terrain); updateMpAlive(ref.state);
  }
  must(stateHash(ref.state) === hs[0], "تحویل فازی بی‌drop با مرجع برابر است");
  // drop: کلاینت عقب‌مانده دقیقاً روی seq گمشده stall می‌کند (قابل‌شناسایی، نه سکوت).
  const A = mpFresh(4), B = mpFresh(4);
  const cliA = tstMpClient(), cliB = tstMpClient();
  for (const m of seqd) tstMpRecv(cliA, m);
  for (const m of seqd) if (m.seq !== 3) tstMpRecv(cliB, m); // گم‌شدن قطعی seq ۳
  for (let tick = 1; tick <= 400; tick++) {
    tstMpDrain(cliA, A, tick); tstMpStep(A);
    tstMpDrain(cliB, B, tick); tstMpStep(B);
  }
  must(cliB.next === 3, "stall دقیقاً روی seq گمشده است (next=" + cliB.next + ")");
  must(stateHash(A.state) === hs[0], "کلاینت سالم با مرجع برابر است");
  must(stateHash(B.state) !== stateHash(A.state), "واگرایی drop قابل‌مشاهده است (هش متفاوت)");
  return { name: "فازینگ شبکه (C-TST-6)", pass: true, detail: "lib + seq سرور + همگرایی/stall" };
}

export function tstCases() {
  return [t_tst_i18n, t_tst_save_migrate, t_tst_bench_mobile, t_tst_refscene, t_tst_mp4, t_tst_netfuzz];
}
