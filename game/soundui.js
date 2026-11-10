// دکمه صدا (0.245.0 — C-CLN-33): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// sound/المان‌ها از بوت می‌آیند (همان الگوی policy.js)؛ wiring اولیه داخل کارخانه است.
import { t } from "./i18n.js";

export function createSoundUI({ sound, soundIconBtn, volMusic, volSfx, volMute }) {
  function paintSoundBtn() {
    soundIconBtn.innerHTML = `<svg class="sb-ic" aria-hidden="true"><use href="#i-${sound.volumes.muted ? "mute" : "sound"}"/></svg>`;
    soundIconBtn.title = sound.volumes.muted ? t("main.sound.mutedTip") : t("ui.sound.onTip");
    // کارت صدا در تنظیمات منو (0.70.0): همان ولوم‌های ماندگار
    if (volMusic) volMusic.value = String(Math.round(sound.volumes.music * 100));
    if (volSfx) volSfx.value = String(Math.round(sound.volumes.sfx * 100));
    if (volMute) {
      volMute.setAttribute("aria-pressed", sound.volumes.muted ? "true" : "false");
      volMute.textContent = (sound.volumes.muted ? "🔇 " : "🔊 ") + t(sound.volumes.muted ? "ui.sound.stateOn" : "ui.sound.stateOff");
    }
  }
  paintSoundBtn();
  soundIconBtn.addEventListener("click", () => {
    sound.setMuted(!sound.volumes.muted);
    paintSoundBtn();
    sound.ack("place");
  });
  if (volMusic) volMusic.addEventListener("input", () => sound.setMusic(volMusic.value / 100));
  if (volSfx) {
    volSfx.addEventListener("input", () => { sound.setSfx(volSfx.value / 100); sound.ui("tick"); });
  }
  if (volMute) volMute.addEventListener("click", () => { sound.setMuted(!sound.volumes.muted); paintSoundBtn(); });
  return { paintSoundBtn };
}
