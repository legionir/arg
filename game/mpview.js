// نمای چندنفره (0.254.0 — C-CLN-60): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { t } from "./i18n.js";
import { faNum } from "./format.js";
import { escName } from "./format.js";
import { PLAYER_COLORS } from "./mp.js";
import { hostStar, isRoomHost } from "./lobby.js";
import { lordPortraitHTML } from "./profile.js";

function $(id) { return document.getElementById(id); }
export function createMpViewUI({ getMpSession, getState }) {
  function mpStatus(msg) {
    const el = $("mpStatusEl");
    if (el && msg !== undefined) el.textContent = msg;
  }
  // پیشرفت همگام‌سازی عقب‌ماندگی در کارت چندنفره (0.141.0)؛ null = پنهان.
  function paintSync(cur, total) {
    const el = $("mpSyncEl");
    if (!el) return;
    if (cur == null) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = t("main.mp.syncing", { n: faNum(cur), total: faNum(total) });
  }
  function paintMp(api) {
    const conn = $("mpConn"), box = $("mpRosterEl"), list = $("mpListEl");
    if (conn) conn.textContent = api.connected ? t("main.mp.connected") : t("main.mp.disconnected");
    if (!box) return;
    // حالت تماشا (0.141.0): اتاقی ندارم ولی بازی میهمان را می‌بینم.
    if (!api.room && api.watchInfo) {
      const w = api.watchInfo;
      box.innerHTML = `<div class="lbl">${t("main.mp.watching", { code: w.code })}</div>` +
        w.players.map((p) => `<div class="stat"><span><span class="rosterLogo">${lordPortraitHTML(p.logo ?? 0)}</span>${escName(p.name)} (${t("main.mp.player", { n: p.slot + 1 })})</span><span>${p.on === false ? "…" : "●"}</span></div>`).join("");
      return;
    }
    if (!api.room) {
      box.innerHTML = `<div class="lbl">${t("main.mp.noRoom")}</div>`;
      mpStatus(api.connected ? t("main.mp.idle") : t("main.mp.connecting"));
      return;
    }
    const r = api.room;
    const me = r.players.find((p) => p.slot === api.mySlot);
    const lockTxt = r.priv ? ` 🔒${t("main.mp.private")}` : ` 🔓${t("main.mp.public")}`;
    const seedTxt = (r.seed | 0) ? ` — ${t("main.mp.seed", { seed: r.seed >>> 0 })}` : "";
    const stateTxt = r.over ? ` — 🏁 ${t("system.lobby.finished")}` : (r.started ? ` — ${t("main.mp.inProgress")}` : "");
    const rulesTxt = (r.noCow ? ` — ${t("ui.mp.noCow")}` : "") + (r.strongWalls ? ` — ${t("ui.mp.strongWalls")}` : "") + (r.noRush ? ` — ${t("ui.mp.noRush")}` : "") + (r.noDogs ? ` — ${t("ui.mp.noDogs")}` : ""); // گزینه‌های اتاق (0.147.0 — §۱۲.۴؛ 0.148.0 — §۱۴.۲؛ 0.149.0 — §۱۴.۲/بند ۷۳۰)
    box.innerHTML = `<div class="lbl">${t("main.mp.code")} <b>${r.code}</b>${lockTxt}${seedTxt} — ${t("main.mp.youArePlayer", { n: api.mySlot + 1 })}${stateTxt}${rulesTxt}</div>` +
      r.players.map((p) => {
        // در بازی جاری، «…» یعنی قطع‌شده (اسلات نگه‌داشته‌شده) — نه «ناآماده».
        const mark = r.started ? (p.on === false ? "…" : "●") : (p.ready ? t("main.mp.readyMark") : "…");
        const star = hostStar(r, p.slot) ? "★" : ""; // ستاره میزبان (بند 718)
        return `<div class="stat"><span><span class="rosterLogo">${lordPortraitHTML(p.logo ?? 0)}</span>${escName(p.name)} (${t("main.mp.player", { n: p.slot + 1 })})${star}</span><span>${mark}</span></div>`;
      }).join("");
    if (!r.started) {
      mpStatus(!me ? "…" : me.ready ? t("main.mp.waitOthers") : t("main.mp.pressReady"));
    }
    { const sb = $("mpStartBtn"); if (sb && r && !r.started) sb.hidden = !isRoomHost(r, api.mySlot); else if (sb && !r) sb.hidden = false; } // شروع فقط میزبان (سرور nohost؛ بند 718)
    if (list && list.dataset && list.dataset.show === "1") void 0;
  }
  function mpRosterHTML() {
    if (!getMpSession() || !getState().mp) return "";
    return getState().mpres.map((pl, i) => {
      const col = PLAYER_COLORS[i] || "#999";
      const nm = escName((getMpSession().names && getMpSession().names[i]) || t("main.mp.player", { n: i + 1 }));
      const logo = getMpSession().logos ? lordPortraitHTML(getMpSession().logos[i]) : "";
      const tag = i === getMpSession().slot ? ` ${t("main.mp.youTag")}` : "";
      const st = pl.alive === false ? "💀" : "●";
      return `<div class="res"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col};"></i><span class="rosterLogo">${logo}</span> ${nm}${tag}</span><b>${st}</b></div>`;
    }).join("");
  }
  return { mpStatus, paintSync, paintMp, mpRosterHTML };
}
