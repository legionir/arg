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

export function countOwn(state) {
  const c = { woodcutter: 0, farm: 0, hut: 0, quarry: 0, tower: 0, barracks: 0, soldiers: 0 };
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

// کارت ساختمانی که هر راهنما اشاره می‌کند (برای هایلایت پالت)؛ null = راهنمای غیرساختمانی.
const HINT_BUILDING = { woodcutter: "woodcutter", farm: "farm", hut: "hut", quarry: "quarry", tower: "tower", barracks: "barracks" };
export function hintBuilding(hintKey) {
  return hintKey ? (HINT_BUILDING[String(hintKey).replace("ui.hint.", "")] || null) : null;
}
