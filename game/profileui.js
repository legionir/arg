// پروفایل نمایشی (0.239.0 — C-CLN-15): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { profileBadgeHTML, randomDefaultName, validProfileName, saveProfile, PROFILE_LORDS, lordPortraitSrc, lordName } from "./profile.js";
import { t } from "./i18n.js";

function $(id) { return document.getElementById(id); }

export function warName(profile) {
  return profile.name || randomDefaultName();
}
export function warLogo(profile) {
  return profile.logo | 0;
}
export function paintBadge(profile) {
  const el = $("profileBadgeEl");
  if (el) el.innerHTML = profileBadgeHTML(profile);
  const chip = $("profileChipBody");
  if (chip) chip.innerHTML = profileBadgeHTML(profile);
}
export function syncProfileInput(profile) {
  const inp = $("profileNameInput");
  if (inp && document.activeElement !== inp) inp.value = profile.name;
  paintBadge(profile);
  const grid = $("profileLogoGrid");
  if (grid) {
    for (const btn of grid.querySelectorAll("[data-logo]")) {
      btn.classList.toggle("sel", (btn.dataset.logo | 0) === profile.logo);
    }
  }
}

// سیم‌کشی پروفایل منوی شروع (0.261.0 — C-CLN-81): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
export function wireProfileUI({ getProfile, setProfile, menuMsg, lobby }) {
    const inp = $("profileNameInput");
    if (inp) {
      inp.value = getProfile().name;
      inp.addEventListener("change", () => {
        const v = validProfileName(inp.value);
        if (v === null) {
          inp.value = getProfile().name;
          menuMsg(t("main.profile.nameInvalid"));
          return;
        }
        const saved = saveProfile({ name: v, logo: getProfile().logo });
        if (saved) {
          setProfile(saved);
          menuMsg("");
          try { if (lobby.isInRoom()) lobby.updateProfile(); } catch (e) {}
        }
        syncProfileInput(getProfile());
      });
    }
    const grid = $("profileLogoGrid");
    if (grid) {
      grid.innerHTML = "";
      PROFILE_LORDS.forEach((lord, i) => {
        const btn = document.createElement("button");
        btn.dataset.logo = i;
        const img = document.createElement("img");
        img.src = lordPortraitSrc(i);
        img.alt = lord.name;
        img.loading = "lazy";
        img.draggable = false;
        img.onerror = () => { img.style.visibility = "hidden"; };
        btn.appendChild(img);
        btn.title = `${lordName(i)} (${t("main.profile.logoTitle", { n: i + 1 })})`;
        btn.addEventListener("click", () => {
          const saved = saveProfile({ name: getProfile().name, logo: i });
          if (saved) {
            setProfile(saved);
            try { if (lobby.isInRoom()) lobby.updateProfile(); } catch (e) {}
          }
          syncProfileInput(getProfile());
        });
        grid.appendChild(btn);
      });
    }
    syncProfileInput(getProfile());
}
