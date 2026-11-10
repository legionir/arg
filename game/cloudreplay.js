// ابر/ری‌پلی (0.269.0 — C-CLN-89): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { initCloud, validCloudKey, CLOUD_FA, CLOUD_STORE_KEY } from "./cloud.js";
import { t } from "./i18n.js";
import { serializeJSON, deserializeJSON, SaveError, SAVE_FA } from "./persist.js";
import { verifyReplayAsync, saveReplaySlot, loadReplaySlot } from "./replay.js";
import { stateHash } from "./mp.js";
import { faNum } from "./format.js";

export function createCloudReplayUI({ getMpSession, getState, getRecLog, getReplayWatch, later, $ }) {
  // ---- ذخیره ابری (0.67.0 — انتخاب ۳-الف): همان JSON محلی روی سرور، با عبارت کاربر ----
  const cloud = initCloud();
  const cloudStatus = $("cloudStatus"), cloudKeyInput = $("cloudKeyInput");
  try {
    const savedKey = localStorage.getItem(CLOUD_STORE_KEY);
    if (savedKey && cloudKeyInput) cloudKeyInput.value = savedKey;
  } catch (e) {}
  if (cloudKeyInput) {
    cloudKeyInput.addEventListener("change", () => {
      try { localStorage.setItem(CLOUD_STORE_KEY, cloudKeyInput.value); } catch (e) {}
    });
  }
  const cloudSay = (m) => { if (cloudStatus) cloudStatus.textContent = m; };
  const cloudKey = () => (cloudKeyInput && cloudKeyInput.value) || "";
  $("cloudSaveBtn").addEventListener("click", async () => {
    if (getMpSession()) return; // در MP ابری نداریم
    const k = cloudKey();
    if (!validCloudKey(k)) { cloudSay(CLOUD_FA.BAD_KEY); return; }
    cloudSay(t("main.cloud.saving"));
    const r = await cloud.save(k, serializeJSON(getState()));
    cloudSay(r.ok ? t("main.cloud.saved", { tick: getState().tick }) : t("main.err.prefix", { msg: CLOUD_FA[r.error] || r.error }));
  });
  $("cloudLoadBtn").addEventListener("click", async () => {
    const { applyLoaded } = later();
    if (getMpSession()) return;
    const k = cloudKey();
    if (!validCloudKey(k)) { cloudSay(CLOUD_FA.BAD_KEY); return; }
    cloudSay(t("main.cloud.loading"));
    const r = await cloud.load(k);
    if (!r.ok) { cloudSay(t("main.err.prefix", { msg: CLOUD_FA[r.error] || r.error })); return; }
    try {
      applyLoaded(deserializeJSON(r.text), t("main.cloud.loadedLabel"));
      cloudSay(t("main.cloud.loaded", { tick: getState().tick }));
    } catch (e) {
      cloudSay(t("main.err.prefix", { msg: e instanceof SaveError ? SAVE_FA[e.code] : e }));
    }
  });
  $("cloudDelBtn").addEventListener("click", async () => {
    if (getMpSession()) return;
    const k = cloudKey();
    if (!validCloudKey(k)) { cloudSay(CLOUD_FA.BAD_KEY); return; }
    cloudSay(t("main.cloud.deleting"));
    const r = await cloud.del(k);
    cloudSay(r.ok ? t("main.cloud.deleted") : t("main.err.prefix", { msg: CLOUD_FA[r.error] || r.error }));
  });
  $("replaySaveBtn").addEventListener("click", () => {
    const { replayLogOf, paintReplayStatus } = later();
    if (getMpSession() || getReplayWatch()) return;
    if (!getRecLog()) { replayStatus.textContent = t("main.replay.freshOnly"); return; }
    const log = { ...replayLogOf(getRecLog(), getState().tick), hash: stateHash(getState()), verified: false };
    replayStatus.textContent = t("main.replay.verifying", { n: log.cmds.length, num: faNum(log.cmds.length), tick: faNum(log.ticks) });
    verifyReplayAsync(log, log.ticks, log.hash, (tk, upto) => {
      replayStatus.textContent = t("main.replay.progress", { tick: faNum(tk), upto: faNum(upto) });
    }).then((r) => {
      log.verified = r.ok;
      if (r.ok) saveReplaySlot(log);
      replayStatus.textContent = r.ok
        ? t("main.replay.verified", { tick: faNum(log.ticks) })
        : t("main.replay.notVerified", { reason: r.reason || t("main.replay.hashDiff") });
      paintReplayStatus();
    });
  });
  $("replayWatchBtn").addEventListener("click", () => {
    const { replayLogOf, startWatch } = later();
    if (getMpSession() || getReplayWatch()) return;
    if (getRecLog() && getRecLog().cmds.length) {
      const r = startWatch(replayLogOf(getRecLog(), getState().tick), t("main.replay.current"));
      if (!r.ok) replayStatus.textContent = t("main.err.prefix", { msg: r.reason });
      return;
    }
    const saved = loadReplaySlot();
    if (!saved) { replayStatus.textContent = t("main.replay.noneToWatch"); return; }
    const r = startWatch(saved, t("main.replay.savedLabel"));
    if (!r.ok) replayStatus.textContent = t("main.err.prefix", { msg: r.reason });
  });
  $("replayExitBtn").addEventListener("click", () => {
    const { exitWatch } = later();
    exitWatch(true);
  });
}
