// پنل دشمن (0.274.0): تصویر و اطلاعات پادشاهِ آیتم دشمن — خالص و فقط‌خواندنی.
// کلیک خنثی روی نیرو/ساختمانِ دشمن → پنل foeCard در buildBar (جای کارت
// ساختمان‌ها و آمار): تصویر پادشاه سمت راست، اطلاعات زیر هم سمت چپ تصویر.
// نگاشت شخصیت AI به پرتره لردها (assets/lords): گرگ/موش/مار/خوک/شیر/امیر/صلاح‌الدین.
import { t, withLang } from "./i18n.js";
import { CONFIG } from "./config.js";
import { UNITS, STANCE_FA, buildingInfo } from "./combat.js";
import { aiPersonalityName, AI_OWNER } from "./ai.js";
import { lordPortraitSrc, validLogo } from "./profile.js";
import { faNum } from "./format.js";

export const PERSONALITY_LORD = {
  artan: 0, kahbod: 1, tirazheh: 2, farrokhan: 3, sepehrdad: 4, hamun: 5, azarm: 6,
};

// رشته کاروان در هر دو زبان (رویدادها با زبانِ لحظه push ذخیره می‌شوند؛
// پس فیلتر نمایش و ماشه toast باید هر دو را بشناسد).
const CARAVAN_FA = withLang("fa", () => t("game.ev.caravan"));
const CARAVAN_EN = withLang("en", () => t("game.ev.caravan"));

export function isCaravanMsg(msg) {
  return msg === CARAVAN_FA || msg === CARAVAN_EN;
}

// پادشاهِ مالک: سولو (owner=9 → شخصیت AI) یا MP (اسلات حریف → نام/لوگوی نشست).
// خروجی null یعنی پادشاهی نیست (موج/خنثی/خودی) — پنل فقط اطلاعات آیتم را می‌دهد.
export function foeKingFor(state, mpSession, owner) {
  const ow = owner == null ? 0 : owner;
  if (mpSession) { // نشست چندنفره مرجع است (مالک ۹ سولو در MP رخ نمی‌دهد)
    const me = mpSession.slot;
    if (ow !== me && ow >= 0 && ow <= 3) {
      const nm = (mpSession.names && mpSession.names[ow]) || t("ui.foe.player", { n: faNum(ow + 1) });
      const lg = mpSession.logos && mpSession.logos[ow] != null ? mpSession.logos[ow] : 0;
      return { kind: "mp", name: nm, desc: "", logo: validLogo(lg) == null ? 0 : lg, slot: ow };
    }
    return null;
  }
  if (ow === AI_OWNER && state && state.ai) {
    const k = state.ai.personality && CONFIG.AI.personalities[state.ai.personality]
      ? state.ai.personality : CONFIG.AI.defaultPersonality;
    const p = CONFIG.AI.personalities[k];
    const logo = PERSONALITY_LORD[k] != null ? PERSONALITY_LORD[k] : 0;
    return { kind: "ai", name: aiPersonalityName(state.ai), desc: p ? p.desc : "", logo };
  }
  return null;
}

// داده کامل پنل برای foe گذرا ({kind:"unit"|"bld", id}) — null یعنی هدف رفت/ویران.
export function foePanelData(state, mpSession, foe) {
  if (!state || !foe) return null;
  if (foe.kind === "bld") {
    const b = state.buildings.find((x) => x.id === foe.id);
    if (!b || b.destroyed) return null;
    const def = CONFIG.BUILDINGS[b.type];
    const bi = buildingInfo(b, def);
    const king = foeKingFor(state, mpSession, b.owner == null ? 0 : b.owner);
    const hpText = bi.hp == null ? t("main.unknown")
      : t("main.bld.hp", { hp: faNum(bi.hp), max: faNum(bi.maxHp == null ? bi.hp : bi.maxHp) });
    const stateText = bi.destroyed ? t("main.bld.ruin")
      : (bi.buildPct != null ? t("main.bld.building", { p: faNum(bi.buildPct) }) : t("main.bld.done"));
    return {
      title: king ? king.name : bi.name,
      tag: king ? "" : t("ui.foe.wave"),
      desc: king ? king.desc : "",
      logoSrc: king ? lordPortraitSrc(king.logo) : "",
      itemName: t("main.bld.name", { name: bi.name, id: b.id }),
      hpText, stateText,
    };
  }
  const u = state.units.find((x) => x.id === foe.id);
  if (!u || u.dead) return null;
  const udef = UNITS[u.type] || {};
  const king = foeKingFor(state, mpSession, u.owner == null ? 0 : u.owner);
  const itemName = t("main.unit.name", {
    name: udef.name || u.type, id: u.id, stance: (STANCE_FA && STANCE_FA[u.stance]) || u.stance,
  });
  return {
    title: king ? king.name : (udef.name || u.type),
    tag: king ? "" : t("ui.foe.wave"),
    desc: king ? king.desc : "",
    logoSrc: king ? lordPortraitSrc(king.logo) : "",
    itemName,
    hpText: `${faNum(u.hp)}/${faNum(u.maxHp)}`,
    stateText: (STANCE_FA && STANCE_FA[u.stance]) || u.stance,
  };
}
