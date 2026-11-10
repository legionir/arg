// سوئیت صدا/منو/راهنما (0.237.0 — C-CLN-8): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { tryPlace } from "../construction.js";
import { hireUnit } from "../combat.js";
import {
  VOL_KEY, MAX_EVENTS_PER_TICK, loadVolumes, saveVolumes,
  diffSoundEvents, countWalking, soundSnapshot, createSoundManager,
} from "../sound.js";
import { createMenuNav, MENU_PAGES } from "../menunav.js";
import { nextHint, HINT_STEPS, hintBuilding } from "../hints.js";
import { must, fresh, needBarracks, stubCtx } from "./fixtures.js";

// --- صدای سنتزشده (0.48.0 — #۲۵ از FEATURES): diff خالص + ولوم + مدیر با ctx قلابی ---

function sndSnap(buildings, units, flags) {
  return {
    buildings: buildings || [], units: units || [],
    victorious: !!(flags && flags.victorious), defeated: !!(flags && flags.defeated),
  };
}
function sndBld(id, extra) {
  return Object.assign({ id, type: "hut", buildLeft: 0, destroyed: false }, extra || {});
}
function sndUnit(id, extra) {
  return Object.assign({ id, cooldown: 0, dead: false, x: 5, r: 5 }, extra || {});
}

function t_sound_diff_bld() {
  const before = sndSnap([], []);
  let ev = diffSoundEvents(before, sndSnap([sndBld(1)], []));
  must(ev.length === 1 && ev[0].kind === "placed", `ساخت باید placed بدهد، شد ${JSON.stringify(ev)}`);
  const half = sndSnap([sndBld(2, { buildLeft: 15 })], []);
  const done = sndSnap([sndBld(2, { buildLeft: 0 })], []);
  ev = diffSoundEvents(half, done);
  must(ev.length === 1 && ev[0].kind === "completed", `اتمام باید completed بدهد، شد ${JSON.stringify(ev)}`);
  ev = diffSoundEvents(done, sndSnap([sndBld(2, { destroyed: true })], []));
  must(ev.length === 1 && ev[0].kind === "razed", `ویرانی باید razed بدهد، شد ${JSON.stringify(ev)}`);
  ev = diffSoundEvents(done, sndSnap([], []));
  must(ev.length === 1 && ev[0].kind === "razed", "حذف هم razed است");
  must(diffSoundEvents(before, before).length === 0, "سکون باید بی‌صدا باشد");
  return { name: "diff ساختمان صدا", pass: true, detail: "placed/completed/razed + سکون" };
}

function t_sound_diff_unit() {
  const calm = sndSnap([], [sndUnit(1)]);
  const struck = sndSnap([], [sndUnit(1, { cooldown: 10 })]);
  let ev = diffSoundEvents(calm, struck);
  must(ev.length === 1 && ev[0].kind === "strike", `ضربه باید strike بدهد، شد ${JSON.stringify(ev)}`);
  ev = diffSoundEvents(struck, sndSnap([], [sndUnit(1, { dead: true })]));
  must(ev.length === 1 && ev[0].kind === "death", `مرگ باید death بدهد، شد ${JSON.stringify(ev)}`);
  ev = diffSoundEvents(calm, sndSnap([], [sndUnit(1)], { victorious: true }));
  must(ev.some((e) => e.kind === "victory" && e.outcome === "victory"), "پیروزی باید fanfare بدهد");
  ev = diffSoundEvents(calm, sndSnap([], [sndUnit(1)], { defeated: true }));
  must(ev.some((e) => e.kind === "victory" && e.outcome === "defeat"), "شکست باید مرثیه بدهد");
  return { name: "diff یگان و پایان صدا", pass: true, detail: "strike/death/victory/defeat" };
}

function t_sound_cap_walk() {
  const units = [];
  for (let i = 1; i <= 20; i++) units.push(sndUnit(i));
  const ev = diffSoundEvents(sndSnap([], units), sndSnap([], []));
  must(ev.length === MAX_EVENTS_PER_TICK, `سقف باید ${MAX_EVENTS_PER_TICK} باشد، شد ${ev.length}`);
  must(ev[0].kind === "death", "ترتیب باید ترتیب اسنپ‌شات باشد");
  const a = JSON.stringify(diffSoundEvents(sndSnap([], units), sndSnap([], [])));
  must(a === JSON.stringify(diffSoundEvents(sndSnap([], units), sndSnap([], []))), "باید قطعی باشد");
  const w0 = sndSnap([], [sndUnit(1, { x: 5 }), sndUnit(2, { x: 7 })]);
  const w1 = sndSnap([], [sndUnit(1, { x: 6 }), sndUnit(2, { x: 7 })]);
  must(countWalking(w0, w1) === 1, "فقط متحرک شمرده می‌شود");
  must(countWalking(w0, w0) === 0 && countWalking(null, w1) === 0, "سکون/تهی صفر است");
  return { name: "سقف و راهپیمایی صدا", pass: true, detail: `سقف ${MAX_EVENTS_PER_TICK} + walk=1` };
}

function t_sound_snapshot_live() {
  // اسنپ‌شات از وضعیت واقعی: ساختمان/یگان/پرچم‌ها را می‌بیند.
  const { state, terrain, W, H } = fresh();
  tryPlace(state, terrain, W, H, 4, 1, CONFIG.BUILDINGS.hut);
  needBarracks(state, terrain, W, H);
  hireUnit(state, terrain, W, H, 5, 5, "soldier");
  const snap = soundSnapshot(state);
  must(snap.buildings.length >= 2, `باید ≥۲ ساختمان ببیند، دید ${snap.buildings.length}`);
  must(snap.units.length >= 1, "باید یگان ببیند");
  must(snap.buildings.every((b) => b.id && b.type && (b.buildLeft || 0) >= 0), "فیلدهای ساختمان کامل‌اند");
  must(snap.victorious === false && snap.defeated === false, "پرچم‌های پایان falseاند");
  state.victorious = true;
  must(soundSnapshot(state).victorious === true, "پیروزی در اسنپ‌شات می‌آید");
  state.victorious = false;
  return { name: "اسنپ‌شات زنده صدا", pass: true, detail: "ساختمان/یگان/پرچم" };
}

function t_sound_mgr_stub() {
  const { ctx, calls } = stubCtx();
  const mgr = createSoundManager({ ctxFactory: () => ctx });
  must(!mgr.started, "زود شروع نکرده باشد");
  mgr.ack("order"); // پیش از شروع بی‌صدا می‌ریزد
  must(mgr.update(sndSnap([], []), sndSnap([sndBld(1)], [])).length === 0, "پیش از شروع رویداد نیست");
  must(mgr.ensureStarted() && mgr.started, "باید شروع شود");
  const ev = mgr.update(sndSnap([], []), sndSnap([sndBld(1)], []));
  must(ev.length === 1 && ev[0].kind === "placed", "پس از شروع placed می‌آید");
  const fight0 = sndSnap([], [sndUnit(1)]);
  const fight1 = sndSnap([], [sndUnit(1, { cooldown: 10 })]);
  must(mgr.update(fight0, fight1).some((e) => e.kind === "strike"), "باید strike بدهد");
  must(calls.tones > 0, "باید نوسان‌ساز زمان‌بندی شده باشد");
  must(mgr.log.includes("strike"), "لاگ باید strike داشته باشد");
  mgr.ack("order");
  mgr.ack("deny");
  return { name: "مدیر صدا با ctx قلابی", pass: true, detail: "شروع/زمان‌بندی/لاگ" };
}

function t_sound_mgr_nofail() {
  const mgr = createSoundManager({ ctxFactory: () => { throw new Error("no webaudio"); } });
  must(mgr.ensureStarted() === false, "نباید ادعای شروع کند");
  mgr.ack("order");
  must(mgr.update(sndSnap([], [sndUnit(1)]), sndSnap([], [])).length === 0, "بدون ctx رویداد نیست");
  const mgr2 = createSoundManager({ ctxFactory: () => stubCtx().ctx });
  mgr2.setMusic(2);
  mgr2.setSfx(-1);
  must(mgr2.volumes.music === 1 && mgr2.volumes.sfx === 0, "ولوم باید clamp شود");
  const back = loadVolumes();
  must(back.music === 1 && back.sfx === 0, `ماندگاری ولوم: ${JSON.stringify(back)}`);
  mgr2.setMusic(0.6);
  mgr2.setSfx(0.8);
  mgr2.setMuted(false);
  saveVolumes(mgr2.volumes);
  try { localStorage.removeItem(VOL_KEY); } catch (e) {}
  return { name: "خرابی صدا بازی را نمی‌شکند", pass: true, detail: "factory خراب + clamp + persist" };
}


// --- صدای رابط + موسیقی مولد (0.70.0) ---
function t_sound_ui_music() {
  const { ctx, calls } = stubCtx();
  const mgr = createSoundManager({ ctxFactory: () => ctx });
  mgr.ui("click"); mgr.tick(); // پیش از شروع بی‌اثر و بدون خطا
  must(calls.tones === 0, "پیش از شروع نباید نوسان‌ساز بسازد");
  must(mgr.ensureStarted(), "شروع باید موفق باشد");
  const afterStart = calls.tones;
  for (const k of ["click", "hover", "back", "open", "tick", "start"]) mgr.ui(k);
  for (const k of ["place", "order", "deny", "coin", "alarm", "hire"]) mgr.ack(k);
  must(calls.tones > afterStart + 10, `جلوه‌های رابط/بازی باید نوسان بسازند (${calls.tones - afterStart})`);
  // هاور محدودکننده دارد: دو هاور هم‌زمان = یکی
  const c1 = calls.tones; mgr.ui("hover"); mgr.ui("hover");
  must(calls.tones - c1 <= 1, "هاور باید throttle شود");
  // موسیقی: tick با ساعت ثابت فقط یک نت می‌زند، با پیشروی ساعت نت بعدی
  const m0 = calls.tones; mgr.tick(); mgr.tick();
  const first = calls.tones - m0;
  ctx.currentTime += 60; mgr.tick();
  must(calls.tones > m0 + first || first >= 1, "tick باید با پیشروی ساعت نت بزند");
  mgr.setMood("menu"); mgr.setMood("game");
  must(mgr.mood === "game", "حالت باید game شود");
  mgr.setMood("بی‌معنی");
  must(mgr.mood === "game", "حالت نامعتبر به game برمی‌گردد");
  // شدت نبرد → طبل
  mgr.setIntensity(1); ctx.currentTime += 5; const d0 = calls.tones; mgr.tick();
  must(calls.tones > d0, "با شدت بالا باید ضربه طبل بیاید");
  // سقف هم‌زمانی: انفجار جلوه‌ها بی‌پایان نوسان نمی‌سازد
  const v0 = calls.tones; for (let i = 0; i < 200; i++) mgr.ack("place");
  must(calls.tones - v0 < 200, "سقف voice باید جلوی انفجار را بگیرد");
  mgr.setSuspended(true); mgr.setSuspended(false);
  mgr.setMuted(true); const mm = calls.tones; ctx.currentTime += 60; mgr.tick();
  must(calls.tones === mm, "در حالت بی‌صدا موسیقی زمان‌بندی نمی‌شود");
  mgr.setMuted(false);
  return { name: "صدای رابط و موسیقی مولد", pass: true, detail: "ui/ack/mood/drum/limit/mute" };
}

// --- ناوبری منوی اصلی (0.70.0): صفحه اول = فهرست؛ هر دکمه = بخش خودش ---
function t_menu_nav() {
  const nav = createMenuNav();
  must(nav.current === "home" && nav.depth === 1, "شروع روی home");
  must(nav.go("solo") === "solo" && nav.depth === 2, "رفتن به solo");
  must(nav.go("solo") === "solo" && nav.depth === 2, "تکرار پشت‌سرهم پشته را بزرگ نمی‌کند");
  must(nav.go("settings") === "settings" && nav.depth === 3, "عمق ۳");
  must(nav.back() === "solo" && nav.back() === "home", "بازگشت پله‌ای");
  must(nav.back() === "home" && nav.depth === 1, "بازگشت از home بی‌اثر");
  must(nav.go("نامعتبر") === "home", "صفحه ناشناخته = home");
  nav.go("mp"); nav.go("profile");
  must(nav.go("home") === "home" && nav.depth === 1, "go(home) پشته را ریست می‌کند");
  nav.go("mp"); must(nav.reset() === "home" && nav.current === "home", "reset");
  must(MENU_PAGES.includes("home") && new Set(MENU_PAGES).size === MENU_PAGES.length, "فهرست صفحه‌ها یکتا");
  // DOM زنده: هر صفحه‌ی فهرست‌شده یک section دارد و دکمه‌های صفحه اول به آن‌ها می‌روند
  if (typeof document !== "undefined" && document.getElementById("menuBox")) {
    const box = document.getElementById("menuBox");
    for (const p of MENU_PAGES) must(box.querySelector(`.menu-page[data-page="${p}"]`), `section صفحه ${p} نیست`);
    const goes = [...box.querySelectorAll('.menu-page[data-page="home"] [data-go]')].map((b) => b.dataset.go);
    for (const g of goes) must(MENU_PAGES.includes(g), `data-go نامعتبر: ${g}`);
    for (const id of ["soloBtn", "mpCard", "profileNameInput", "volMusic", "a11yPalSel"]) must(document.getElementById(id), `#${id} باید در منو باشد`);
  }
  return { name: "ناوبری منوی چندصفحه‌ای", pass: true, detail: "پشته + DOM" };
}

// --- راهنمای هدف بعدی (0.70.0): ترتیب نقاط عطف + نادیده‌گرفتن نیمه‌کاره/ویران/حریف ---
function t_hints() {
  const B = (type, extra) => Object.assign({ type, owner: 0, buildLeft: 0, destroyed: false }, extra || {});
  must(nextHint({ buildings: [], units: [] }) === "ui.hint.woodcutter", "شروع = چوب‌بری");
  let st = { buildings: [B("woodcutter")], units: [] };
  must(nextHint(st) === "ui.hint.farm", "بعد مزرعه");
  st.buildings.push(B("farm"), B("hut"));
  must(nextHint(st) === "ui.hint.hut", "یک کلبه کافی نیست");
  st.buildings.push(B("hut"), B("quarry", { buildLeft: 5 }));
  must(nextHint(st) === "ui.hint.quarry", "معدن نیمه‌کاره حساب نمی‌شود");
  st.buildings[st.buildings.length - 1].buildLeft = 0;
  st.buildings.push(B("tower", { destroyed: true }), B("tower", { owner: 9 }));
  must(nextHint(st) === "ui.hint.tower", "برج ویران/حریف حساب نمی‌شود");
  st.buildings.push(B("tower"), B("tower"), B("barracks"));
  must(nextHint(st) === "ui.hint.hire", "سربازخانه هست، سرباز نیست");
  st.units.push({ type: "soldier", owner: 0, dead: false }, { type: "lord", owner: 0, dead: false });
  must(nextHint(st) === null, "همه نقاط عطف = بدون راهنما");
  must(hintBuilding("ui.hint.woodcutter") === "woodcutter" && hintBuilding("ui.hint.hire") === null && hintBuilding(null) === null, "نگاشت راهنما به کارت ساختمان");
  must(HINT_STEPS.length === 7 && new Set(HINT_STEPS.map((x) => x.key)).size === 7, "گام‌های یکتا");
  return { name: "راهنمای هدف بعدی", pass: true, detail: "ترتیب + فیلتر" };
}

export function soundCases() {
  return [t_sound_diff_bld, t_sound_diff_unit, t_sound_cap_walk,
    t_sound_snapshot_live, t_sound_mgr_stub, t_sound_mgr_nofail, t_sound_ui_music, t_menu_nav, t_hints];
}