// راهنمای هدف بعدی (onboarding) — خالص، فقط نمایش: اولین نقطه عطف برآورده‌نشده را برمی‌گرداند.
// فقط ساختمان‌های سالم و کامل‌شده بازیکن (owner ۰) شمرده می‌شوند؛ هیچ‌چیز در state نوشته نمی‌شود.
export const HINT_STEPS = [
  { key: "woodcutter", have: (c) => c.woodcutter >= 1 },
  { key: "farm", have: (c) => c.farm >= 1 },
  { key: "hut", have: (c) => c.hut >= 2 },
  { key: "quarry", have: (c) => c.quarry >= 1 },
  { key: "tower", have: (c) => c.tower >= 2 },
  { key: "barracks", have: (c) => c.barracks >= 1 },
  { key: "hire", have: (c) => c.soldiers >= 1 },
];

import { CONFIG } from "./config.js";
import { aiRaidPlan } from "./ai.js";

// هدف‌های میان‌مدت (0.289.0 — T14): پس از هفت نقطه عطف آموزش، مسیر تا قلعه‌ی کامل را نشان می‌دهند.
// جدا از HINT_STEPS تا آموزش آغازین همان هفت قدم بماند.
export const MID_GOALS = [
  { key: "granary", have: (c) => c.granary >= 1 },
  { key: "bread", have: (c) => c.wheatfarm >= 1 && c.mill >= 1 && c.bakery >= 1 },
  { key: "market", have: (c) => c.market >= 1 },
  { key: "walls", have: (c) => c.wall + c.crenwall + c.lowwall >= 8 && c.gate >= 1 },
  { key: "armoury", have: (c) => c.armoury >= 1 },
  { key: "army", have: (c) => c.soldiers >= 8 },
  { key: "temple", have: (c) => c.chapel + c.church + c.cathedral >= 1 },
];

export function countOwn(state) {
  const c = { woodcutter: 0, farm: 0, hut: 0, quarry: 0, tower: 0, barracks: 0, soldiers: 0,
    granary: 0, wheatfarm: 0, mill: 0, bakery: 0, market: 0, wall: 0, crenwall: 0, lowwall: 0, gate: 0, armoury: 0, chapel: 0, church: 0, cathedral: 0 };
  for (const b of state.buildings || []) {
    if (b.destroyed || (b.buildLeft || 0) > 0 || (b.owner != null && b.owner !== 0)) continue;
    if (b.type in c) c[b.type] += 1;
  }
  for (const u of state.units || []) {
    if (!u.dead && (u.owner == null || u.owner === 0) && u.side !== "enemy" && u.type !== "lord") c.soldiers += 1;
  }
  return c;
}

// کلید i18n راهنمای بعدی یا null (همه نقاط عطف برآورده‌اند).
export function nextHint(state) {
  const c = countOwn(state);
  for (const s of HINT_STEPS) if (!s.have(c)) return "ui.hint." + s.key;
  return null;
}

// هدف میان‌مدت بعدی (کلید i18n) یا null؛ فقط وقتی آموزش آغازین تمام شده معنا دارد.
export function nextGoal(state) {
  const c = countOwn(state);
  for (const s of MID_GOALS) if (!s.have(c)) return "ui.goal." + s.key;
  return null;
}

// هشدار یورش نزدیک: ثانیه تا یورش بعدی حریف اگر کمتر از withinSec مانده، وگرنه null.
// خالص و فقط خواندنی (همان aiRaidPlan قطعی sim)؛ در چندنفره و با حریف خاموش null.
export function raidEta(state, withinSec = 90) {
  const ai = state && state.ai;
  if (!ai || !ai.active || ai.dormant || (state.mp && state.mp.enabled) || state.defeated || state.victorious) return null;
  const plan = aiRaidPlan(ai, ai.raidsSent || 0);
  if (!plan) return null;
  const sec = (plan.at - state.tick) / CONFIG.TICK_HZ;
  return sec > 0 && sec <= withinSec ? Math.ceil(sec / 10) * 10 : null;
}

// کارت ساختمانی که هر راهنما اشاره می‌کند (برای هایلایت پالت)؛ null = راهنمای غیرساختمانی.
const HINT_BUILDING = { woodcutter: "woodcutter", farm: "farm", hut: "hut", quarry: "quarry", tower: "tower", barracks: "barracks",
  granary: "granary", bread: "bakery", market: "market", walls: "wall", armoury: "armoury", temple: "chapel" };
export function hintBuilding(hintKey) {
  return hintKey ? (HINT_BUILDING[String(hintKey).replace("ui.hint.", "").replace("ui.goal.", "")] || null) : null;
}
