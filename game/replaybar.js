// نوار ری‌پلی (0.252.0 — C-CLN-54): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { t } from "./i18n.js";
import { faNum } from "./format.js";
import { loadReplaySlot } from "./replay.js";

function $(id) { return document.getElementById(id); }
export function createReplayBarUI({ getReplayWatch, setReplayWatch, getTick, getMpSession, getRecLog }) {
  // ---- ری‌پلی: ذخیره/تماشا/تأیید (0.49.0 — #۲۱ از FEATURES، فقط سولو) ----
  const replayStatus = $("replayStatus");
  function paintReplayStatus() {
    if (!replayStatus) return;
    if (getMpSession()) { replayStatus.textContent = t("main.replay.noMp"); return; }
    const saved = loadReplaySlot();
    const cur = getRecLog() ? t("main.replay.cmds", { n: getRecLog().cmds.length, num: faNum(getRecLog().cmds.length) }) : t("main.replay.noneLoaded");
    replayStatus.textContent = t("main.replay.status", { cur, saved: saved ? t("main.replay.savedInfo", { n: saved.cmds.length, num: faNum(saved.cmds.length), tick: faNum(saved.ticks | 0), ok: saved.verified ? " ✓" : "" }) : t("main.replay.none") });
  }
  function paintReplayBar() {
    const bar = $("replayBar");
    if (!bar) return;
    if (!getReplayWatch()) { bar.hidden = true; return; }
    bar.hidden = false;
    const done = getTick() >= getReplayWatch().upto;
    const lbl = $("replayBarTxt");
    if (lbl) lbl.textContent = t("main.replay.bar", { label: getReplayWatch().label, tick: faNum(getTick()), upto: faNum(getReplayWatch().upto), end: done ? t("main.replay.end") : "" });
  }
  function hideReplayBar() {
    setReplayWatch(null);
    const bar = $("replayBar");
    if (bar) bar.hidden = true;
  }
  return { paintReplayBar, hideReplayBar, paintReplayStatus };
}
