// قلاب‌های view-side هر تیک (0.259.0 — C-CLN-75): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
import { clockReady } from "./missions.js";

export function createTickHooks({ getMpSession, getReplayWatch, getState, getEditor, getMclockStart, setMclockStart, getMastersLogged, setMastersLogged, getMissionActive, checkMission, recordMasters }) {
  // قلاب‌های view-side هر تیک (0.182.0 — بندهای 130/102): ساعت مأموریت + ثبت
  // استادان؛ فقط سولوی زنده (نه تماشا/ویرایشگر)؛ خالص و بی‌اثر بر sim/هش/ذخیره/ری‌پلی.
  // حلقه زنده و ff آزمایشی هر دو همین را صدا می‌زنند (آینه کامل).
    function tickViewHooks() {
      if (!getMpSession() && !getReplayWatch() && !getEditor()) {
        if (getMclockStart() == null && clockReady(getState().buildings, 0)) setMclockStart(getState().tick);
        const over = getState().victorious || getState().defeated;
        if (over && !getMastersLogged()) { setMastersLogged(true); recordMasters(getState().victorious ? "victory" : "defeat"); }
        if (getMissionActive() && !over) checkMission(); // مأموریت view-side (0.225.0 — فاز ۲؛ بی‌اثر بر sim/هش)
      } else if (getReplayWatch() && getMissionActive() && !(getState().victorious || getState().defeated)) {
        checkMission(); // تماشای مأموریت (0.226.0 — C-CMP-6): فقط بنر، بی‌ثبت
      } else if (getMpSession() && getMclockStart() == null) {
        setMclockStart(getState().tick); // در MP قید Keep+Granary نیست — از آغاز مسابقه
      }
    }
  return { tickViewHooks };
}
