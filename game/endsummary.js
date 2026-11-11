// خلاصه پایان بازی (0.283.0): آمار خالص برای بنر پیروزی/شکست — فقط خواندن state.
import { AI_OWNER } from "./ai.js";
import { econOf } from "./economy.js";
import { clockText } from "./missions.js";
import { t } from "./i18n.js";
import { faNum } from "./format.js";

// owner = اسلات بازیکن ناظر (سولو: ۰). بنا/یگان «خودی» = نه حریف AI، نه دشمن، و در چندنفره همان اسلات.
export function endSummary(state, owner) {
  const me = owner | 0, mp = !!(state.mp && state.mp.enabled);
  const mineB = (b) => b && !b.destroyed && b.owner !== AI_OWNER && (!mp || (b.owner | 0) === me);
  const mineU = (u) => u && !u.dead && u.side === "player" && (!mp || (u.owner | 0) === me);
  const ec = econOf(state, me) || {};
  return {
    time: clockText(state.tick, 0),
    buildings: state.buildings.filter(mineB).length,
    units: state.units.filter(mineU).length,
    workers: ec.workers | 0,
    popularity: ec.popularity | 0,
  };
}

export function endSummaryHTML(state, owner) {
  const s = endSummary(state, owner);
  const row = (k, v) => `<li><span>${t("ui.end." + k)}</span><b>${v}</b></li>`;
  return row("time", s.time) + row("buildings", faNum(s.buildings)) + row("units", faNum(s.units)) +
    row("workers", faNum(s.workers)) + row("popularity", faNum(s.popularity));
}
