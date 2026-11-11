// قلاب تست (0.273.0 — C-CLN-93): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { alarmAll, toggleInSet } from "./selection.js";
import { assignStaff } from "./economy.js";
import { cancelOrder, deployUnit, garrisonUnit, hireUnit, orderAttackMove, orderAttackPos, orderMove, orderPatrol, orderRetreat, setGuard, setStance, spawnLord, spawnWave } from "./combat.js";
import { CONFIG } from "./config.js";
import { createState } from "./state.js";
import { enableMp, MP_SPAWN_ANCHOR, mpClearSpawns, stateHash } from "./mp.js";
import { fuzzCmds, fuzzSaves, runRegression, runScenario, REGRESSIONS } from "./regression.js";
import { liveEnv, probeCompat } from "./compat.js";
import { makeTerrain } from "./terrain.js";
import { MISSIONS } from "./missions.js";
import { paintSeed } from "./seed.js";
import { PROFILE_LORDS, saveProfile } from "./profile.js";
import { runBench } from "./bench.js";
import { runFirstTen } from "./firstten.js";
const runIdbTests = () => import("./tests.js").then((m) => m.runIdbTests());
import { placeKeepFor, tryPlace, validate } from "./construction.js";
import { stepSim } from "./sim.js";
import { syncProfileInput } from "./profileui.js";
import { t } from "./i18n.js";
import { showTests } from "./testui.js";

export function createTestHookUI({ getState, getTerrain, getMpSession, getMpDesync, getSelBldId, getSelIds, getSelectedKey, getCmdQueue, getProfile, setState, setTerrain, setMpSession, setMpNextSeq, setSelIds, setSelectedKey, setSelectedUnit, setPendingKind, setProfile, $, canvas, clock, exitWatch, getEditor, getMissionActive, getMissionLost, getMissionWon, hideMenu, lobby, mpHashes, mpHashLog, mpPending, newGame, online, paintCampaign, paintMasters, paintMp, refreshPanel, setMastersFilter, setTick, showMenu, sound, startMission, startWatch, tickViewHooks, renderer, applyMpInput, testBadge }) {
  const __slice01 = // قلاب تست خودکار (page_eval): window.__slice01
  window.__slice01 = {
    view: {
      pan: () => ({ x: renderer.view.panX, y: renderer.view.panY }),
    },
    config: CONFIG,
    online,
    lobby,
    mp: {
      active: () => !!getMpSession(),
      slot: () => (getMpSession() ? getMpSession().slot : -1),
      hash: () => stateHash(getState()),
      hashLog: () => mpHashLog.slice(),
      peerHashes: () => [...mpHashes.entries()],
      desync: () => getMpDesync(),
      startLocal: (num) => {
        // شروع محلی بدون سرور (تست determinism دو نمونه هم‌سان)
        const s = getState().mapSeed >>> 0;
        setTerrain(makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, s));
        mpClearSpawns(getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H);
        setState(createState());
        getState().mapSeed = s;
        const names = [];
        for (let i = 0; i < num; i++) names.push("P" + (i + 1));
        enableMp(getState(), num, names);
        for (let s = 0; s < num; s++) {
          const an = MP_SPAWN_ANCHOR[s];
          placeKeepFor(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H, s, an[0], an[1]);
        }
        for (let s = 0; s < num; s++) spawnLord(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H, s);
        setMpSession({ code: "TEST", slot: 0, num, names, logos: names.map((_, i) => i % PROFILE_LORDS.length) });
        mpPending.clear();
        setMpNextSeq(1);
        clock.reset();
        paintSeed(getState());
        refreshPanel();
        return { keeps: getState().buildings.filter((b) => b.type === "keep").length };
      },
      apply: (m) => { try { applyMpInput(m); refreshPanel(); return true; } catch (e) { return false; } },
      endLocal: () => { setMpSession(null); mpPending.clear(); newGame(); },
    },
    get state() { return getState(); },
    get terrain() { return getTerrain(); },
    ed: () => getEditor(), // ویرایشگر نقشه (0.51.0) — قلاب تست: null یا {doc, tile, brush}
    masters: { // تالار استادان (0.226.0 — C-CMP-4/5): قلاب تست رندر per-مأموریت
      paint: () => paintMasters(),
      filter: (v) => { setMastersFilter(v); paintMasters(); },
    },
    mission: { // کمپین (0.225.0 — فاز ۲): قلاب تست مأموریت
      list: () => MISSIONS.map((m) => m.key),
      start: (key) => startMission(key),
      active: () => (getMissionActive() ? getMissionActive().key : null),
      won: () => getMissionWon(),
      lost: () => getMissionLost(),
      paint: () => paintCampaign(),
      watch: (log) => startWatch(log, t("main.replay.label")), // تماشای مأموریت (0.226.0 — C-CMP-6)
      unwatch: () => exitWatch(true),
    },
    validate: (c, r, key) => {
      const def = CONFIG.BUILDINGS[key || getSelectedKey()];
      if (!def) return { ok: false, reason: "NO_SELECTION" };
      return validate(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H, c, r, def);
    },
    place: (c, r, key) => {
      const def = CONFIG.BUILDINGS[key || getSelectedKey()];
      if (!def) return { ok: false, reason: "NO_SELECTION" };
      const res = tryPlace(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H, c, r, def);
      if (res.ok) assignStaff(getState());
      refreshPanel();
      return res;
    },
    selectedBuilding: () => getSelectedKey(),
    selectedBld: () => getSelBldId(), // حالت ساخت/خنثی — قلاب تست (0.23.4)
    toScreen: (c, r) => renderer.cellToScreen(c, r), // مختصات صفحه خانه — قلاب تست (0.33.0)
    disarm: () => { // خلع کامل به حالت خنثی — قلاب تست (0.23.4)
      setSelectedKey(null); setSelectedUnit(null); setPendingKind(null);
      refreshPanel();
      return null;
    },
    ff: (n) => { // جلو بردن هم‌زمان (تست) — آینه حلقه اصلی
      stepSim(getState(), getTerrain(), n, getCmdQueue());
      setTick(getState().tick);
      tickViewHooks();
      refreshPanel();
      return getState().tick;
    },
    hire: (c, r, key) => {
      const res = hireUnit(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H, c, r, key || "soldier");
      refreshPanel();
      return { ok: res.ok, reason: res.reason };
    },
    wave: () => {
      const n = spawnWave(getState(), getTerrain(), CONFIG.GRID_W, CONFIG.GRID_H);
      refreshPanel();
      return n;
    },
    order: (id, c, r) => {
      const u = getState().units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      return orderMove(getState(), u, c, r);
    },
    attackmove: (id, c, r) => {
      const u = getState().units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      return orderAttackMove(getState(), u, c, r);
    },
    patrol: (id, c, r) => {
      const u = getState().units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      return orderPatrol(getState(), u, c, r);
    },
    attackpos: (id, c, r) => {
      const u = getState().units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      return orderAttackPos(getState(), u, c, r);
    },
    retreat: (id) => {
      const u = getState().units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      return orderRetreat(getState(), u);
    },
    stance: (id, s) => {
      const u = getState().units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      const res = setStance(u, s);
      refreshPanel();
      return res;
    },
    guard: (id, c, r) => { // نگهبانی از ساختمانِ خانه (c,r) — قلاب تست
      const u = getState().units.find((u) => u.id === id);
      const b = getState().buildings.find((b) => c >= b.c && c < b.c + b.w && r >= b.r && r < b.r + b.h) || null;
      if (!u || !b) return { ok: false, reason: "INVALID" };
      const res = setGuard(getState(), u, b);
      refreshPanel();
      return res;
    },
    garrison: (id, c, r) => { // استقرار در برجِ خانه (c,r) — قلاب تست (0.45.0)
      const u = getState().units.find((u) => u.id === id);
      const b = getState().buildings.find((b) => c >= b.c && c < b.c + b.w && r >= b.r && r < b.r + b.h) || null;
      if (!u || !b) return { ok: false, reason: "INVALID" };
      const res = garrisonUnit(getState(), u, b);
      refreshPanel();
      return res;
    },
    deploy: (id) => { // استقرار/جمع منجنیق — قلاب تست (0.46.0)
      const u = getState().units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      const res = deployUnit(getState(), u);
      refreshPanel();
      return res;
    },
    select: (id) => {
      setSelIds([id]);
      setPendingKind(null);
      refreshPanel();
      return getSelIds()[0] || null;
    },
    selected: () => getSelIds()[0] || null,
    selectedIds: () => getSelIds().slice(), // مجموعه انتخاب (0.16.0)
    alarm: (c, r) => { // زنگ خطر — قلاب تست (0.17.0)
      const rs = alarmAll(getState(), c, r);
      if (rs.some((r) => r.ok)) getState().events.push(t("main.alarm.event", { c, r }));
      refreshPanel();
      return rs;
    },
    toggleSelect: (id) => { // ضامن شیفت+کلیک — قلاب تست
      setSelIds(toggleInSet(getSelIds(), id));
      setPendingKind(null);
      refreshPanel();
      return getSelIds().slice();
    },
    cancel: (id) => {
      const u = getState().units.find((u) => u.id === id);
      if (!u) return { ok: false, reason: "INVALID" };
      return cancelOrder(u);
    },
    cmd: (c) => playerCmd( c, getState().tick), // صف فرمان — قلاب تست (0.37.0)
    queueLen: () => getCmdQueue().items.length,
    soundStart: () => sound.ensureStarted(), // شروع صدا — قلاب تست (0.48.0)
    soundLog: () => sound.log.slice(-10), // تازه‌ترین رویدادهای صوتی — قلاب تست (0.48.0)
    soundMuted: () => sound.volumes.muted,
    runTests: () => showTests(testBadge),
    mpPaint: () => paintMp(lobby), // بازپرداخت رستر لابی — قلاب آزمون (0.221.0)
    runIdbTests,
    bench: runBench,
    firstTen: (seed, ticks) => runFirstTen(seed, ticks), // سناریوی ۱۰ دقیقه اول (0.61.0)
    regression: runRegression,
    regressionOne: (key) => runScenario(REGRESSIONS.find((s) => s.key === key)),
    regressionList: () => REGRESSIONS.map((s) => s.key),
    fuzzSaves,
    fuzzCmds,
    compat: () => probeCompat(liveEnv()),
    remains: () => renderer.debugRemains(),
    profile: () => ({ name: getProfile().name, logo: getProfile().logo }), // قلاب تست پروفایل (0.27.0)
    setProfile: (name, logo) => {
      const saved = saveProfile({ name, logo });
      if (saved) {
        setProfile(saved);
        syncProfileInput(getProfile());
        refreshPanel();
      }
      return saved;
    },
    menu: { // قلاب تست منو (0.27.0)
      show: () => showMenu(),
      hide: () => hideMenu(),
      visible: () => { const ms = $("menuScreen"); return !!(ms && !ms.hidden); },
    },
    screenToCell: (sx, sy) => {
      const rect = canvas.getBoundingClientRect();
      return renderer.screenToCell(sx - rect.left, sy - rect.top);
    },
    cellToScreen: (c, r) => {
      const rect = canvas.getBoundingClientRect();
      const p = renderer.cellToScreen(c, r);
      return { x: p.x + rect.left, y: p.y + rect.top };
    },
  };
  return __slice01;
}
