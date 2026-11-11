// ویرایشگر نقشه (0.256.0 — C-CLN-66): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
// `$` محلی عمداً تکراری است (همان تک‌خط main.js): import از main.js چرخه می‌سازد.
import { CONFIG } from "./config.js";
import { makeTerrain } from "./terrain.js";
import { t, hasKey } from "./i18n.js";
import { faNum } from "./format.js";
import { parseSeed } from "./seed.js";
import { createMapDoc, baseTerrain, applyPatches, paintCells, validatePlayable, patchesList, patchCount, clearPatches, saveCustomSlot, loadCustomSlot, exportMapDoc, importMapDoc, BRUSHES, MAP_NAME_MAX, PATCH_CAP, customTerrain } from "./mapedit.js";

function $(id) { return document.getElementById(id); }

export function createEditorUI({ getState, setTerrain, getMpSession, getReplayWatch, getSoloDiff, getMinimapUI, setSelectedKey, setSelectedUnit, setPendingKind, setSelIds, setHover, exitWatch, newGame, hideMercs, hideMarket, clearWallLine, hideBox, hideMenu, showMenu, refreshPanel, menuMsg, renderer, canvas, menuRelabelFns }) {
  // ---- نقشه‌ساز داخل‌بازی (0.51.0 — #۲۲ از FEATURES، الگوی CHG-043) ----
  // نقاشی مستقیم روی بوم اصلی با terrain موقت؛ بازی pause و ساختمان/یگان
  // مخفی‌اند (blankView)؛ ناوبری با نقشه کوچک + زوم. ورود/خروج همیشه از منو.
  let editor = null; // {doc, base, tile, brush, painting} یا null = بازی عادی
  // جدول خطاها به‌صورت جست‌وجوی تنبل (در لحظه نمایش، با زبان فعلی).
  const lazyTable = (prefix) => new Proxy({}, {
    get: (_, k) => (typeof k === "string" && hasKey(prefix + k) ? t(prefix + k) : undefined),
  });
  const ED_ERR_FA = lazyTable("main.ed.err.");
  const ED_DEFAULT_NAME = "نقشه سفارشی"; // مقدار ذخیره‌شده؛ فقط نمایش ترجمه می‌شود
  const edShowName = (n) => (n === ED_DEFAULT_NAME ? t("main.ed.defaultName") : n);
  function blankView() {
    return { ...getState(), buildings: [], units: [], fx: [] };
  }
  function edStatus(m) {
    const el = $("edStatusEl");
    if (el) el.textContent = m || "";
  }
  function edCounts() {
    if (!editor) return;
    const n = patchCount(editor.doc);
    edStatus(t("main.ed.counts", { name: edShowName(editor.doc.name), seed: faNum(editor.doc.seed), n: faNum(n), cap: n >= PATCH_CAP ? ` ${t("main.ed.capMark")}` : "" }));
  }
  function edRefreshTerrain() {
    setTerrain(applyPatches(editor.base, editor.doc.patches));
    renderer.markDirty();
    getMinimapUI().paintMinimap();
  }
  function syncEditorPanel() {
    if (!editor) return;
    const row = $("edTileRow");
    if (row) {
      for (const b of row.querySelectorAll("[data-etile]")) {
        b.classList.toggle("sel", String(editor.tile) === b.dataset.etile);
      }
    }
    const br = $("edBrushSel");
    if (br && document.activeElement !== br) br.value = String(editor.brush);
    const nm = $("edNameInput");
    if (nm && document.activeElement !== nm) nm.value = edShowName(editor.doc.name);
    const sd = $("edSeedInput");
    if (sd && document.activeElement !== sd) sd.value = String(editor.doc.seed);
  }
  function openEditor() {
    if (getMpSession()) { menuMsg(t("main.ed.noMp")); return; }
    if (getReplayWatch()) exitWatch(true);
    if (editor) return;
    const saved = loadCustomSlot();
    const doc = saved || createMapDoc("", getState().mapSeed);
    editor = { doc, base: baseTerrain(doc.seed), tile: 1, brush: 4, painting: false };
    setTerrain(applyPatches(editor.base, doc.patches));
    setSelectedKey(null); setSelectedUnit(null); setPendingKind(null); setSelIds([]);
    setHover(null);
    hideMercs(); hideMarket(); clearWallLine(); hideBox();
    hideMenu();
    getState().paused = true; // پس از hideMenu (که unpause می‌کند)
    const p = $("editorPanel");
    if (p) p.hidden = false;
    syncEditorPanel();
    edCounts();
    renderer.markDirty();
    refreshPanel();
  }
  function closeEditor(silent) {
    if (!editor) return;
    editor = null;
    const p = $("editorPanel");
    if (p) p.hidden = true;
    // terrain بازی جاری را از نو بساز (ویرایشگر آن را عوض کرده بود)
    const ls = (getState().mapSeed == null ? CONFIG.MAP_SEED : getState().mapSeed) >>> 0 || CONFIG.MAP_SEED;
    setTerrain(getState().mapPatches && getState().mapPatches.length
      ? customTerrain(ls, getState().mapPatches)
      : makeTerrain(CONFIG.GRID_W, CONFIG.GRID_H, ls, getState().mapLake || null));
    renderer.markDirty();
    getMinimapUI().paintMinimap();
    refreshPanel();
    if (!silent) showMenu();
  }
  function edCellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return renderer.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
  }
  function edPaintAt(cell) {
    if (!editor || !cell) return 0;
    const tile = editor.tile === "erase" ? null : editor.tile;
    const r = paintCells(editor.doc, editor.base, cell.c, cell.r, editor.brush, tile);
    if (r.painted) edRefreshTerrain();
    if (r.capped) edStatus(t("main.ed.full", { cap: faNum(PATCH_CAP) }));
    else edCounts();
    return r.painted;
  }
  function edCheckPlayable() {
    const v = validatePlayable(editor.doc.seed, patchesList(editor.doc));
    edStatus(v.ok
      ? t("main.ed.playable")
      : t("main.ed.notPlayable", { reason: ED_ERR_FA[v.reason] || v.reason }));
    return v.ok;
  }
  function edReadName() {
    const nm = $("edNameInput");
    const clean = nm ? nm.value.trim().replace(/\s+/g, " ").slice(0, MAP_NAME_MAX) : "";
    editor.doc.name = clean || ED_DEFAULT_NAME;
    if (nm) nm.value = edShowName(editor.doc.name);
  }
  (function wireEditor() {
    const row = $("edTileRow");
    if (row) {
      for (const b of row.querySelectorAll("[data-etile]")) {
        b.addEventListener("click", () => {
          if (!editor) return;
          const v = b.dataset.etile;
          editor.tile = v === "erase" ? "erase" : parseInt(v, 10);
          syncEditorPanel();
        });
      }
    }
    const br = $("edBrushSel");
    if (br) {
      const fillBrushSel = () => {
        const cur = br.value || "4";
        br.innerHTML = "";
        for (const s of BRUSHES) {
          const o = document.createElement("option");
          o.value = String(s);
          o.textContent = s === 1 ? t("main.ed.brushOne") : `${faNum(s)}×${faNum(s)}`;
          br.appendChild(o);
        }
        br.value = cur;
      };
      fillBrushSel();
      menuRelabelFns.push(fillBrushSel);
      br.addEventListener("change", () => {
        if (!editor) return;
        const s = parseInt(br.value, 10);
        editor.brush = BRUSHES.includes(s) ? s : 4;
      });
    }
    const seedBtn = $("edSeedBtn");
    if (seedBtn) seedBtn.addEventListener("click", () => {
      if (!editor) return;
      const inp = $("edSeedInput");
      const s = parseSeed(inp && inp.value);
      if (s == null) { edStatus(t("main.ed.seedInvalid")); return; }
      editor.doc.seed = s;
      editor.doc.patches = {}; // سید تازه = بوم تازه
      editor.base = baseTerrain(s);
      edRefreshTerrain();
      syncEditorPanel();
      edStatus(t("main.ed.seeded", { seed: faNum(s) }));
    });
    const chk = $("edCheckBtn");
    if (chk) chk.addEventListener("click", () => { if (editor) edCheckPlayable(); });
    const clr = $("edClearBtn");
    if (clr) clr.addEventListener("click", () => {
      if (!editor) return;
      clearPatches(editor.doc);
      edRefreshTerrain();
      edCounts();
    });
    const sv = $("edSaveBtn");
    if (sv) sv.addEventListener("click", () => {
      if (!editor) return;
      edReadName();
      if (!edCheckPlayable()) return; // فقط قابل‌بازی ذخیره می‌شود
      edStatus(saveCustomSlot(editor.doc)
        ? t("main.ed.saved", { name: edShowName(editor.doc.name), n: faNum(patchCount(editor.doc)) })
        : t("main.ed.saveFail"));
    });
    const exp = $("edExportBtn");
    if (exp) exp.addEventListener("click", () => {
      if (!editor) return;
      edReadName();
      const ta = $("edIOArea");
      if (ta) {
        ta.value = exportMapDoc(editor.doc);
        ta.select();
        try { document.execCommand("copy"); } catch (e) { /* مهم نیست */ }
      }
      edStatus(t("main.ed.exported", { n: faNum(patchCount(editor.doc)) }));
    });
    const imp = $("edImportBtn");
    if (imp) imp.addEventListener("click", () => {
      if (!editor) return;
      const ta = $("edIOArea");
      const r = importMapDoc(ta ? ta.value : "");
      if (!r.ok) { edStatus(t("main.ed.importBad", { reason: r.reason })); return; }
      editor.doc = r.doc;
      editor.base = baseTerrain(r.doc.seed);
      edRefreshTerrain();
      syncEditorPanel();
      edCounts();
    });
    const play = $("edPlayBtn");
    if (play) play.addEventListener("click", () => {
      if (!editor) return;
      edReadName();
      if (!edCheckPlayable()) return; // فقط قابل‌بازی آزمایش می‌شود
      const custom = { name: editor.doc.name, patches: patchesList(editor.doc) };
      newGame(editor.doc.seed, getSoloDiff(), custom); // خروج خاموش از ویرایشگر داخلش است
      getState().paused = false;
    });
    const ex = $("edExitBtn");
    if (ex) ex.addEventListener("click", () => closeEditor(false));
    const mb = $("editorBtn");
    if (mb) mb.addEventListener("click", () => {
      if (getMpSession()) { menuMsg(t("main.menu.leaveRoomFirst")); return; }
      openEditor();
    });
    // کلیدهای ادیتور (0.180.0 — بند 759): وقتی ویرایشگر باز است و فوکس روی
    // ورودی/دکمه نیست: ۱-۴ = چمن/آب/سنگ/واحه، E = پاک‌کن، +/− = چرخه اندازه
    // قلم BRUSHES. UI-side خالص (فقط editor.tile/brush + syncEditorPanel)؛
    // شاخه‌های هندلر اصلی (گروه/بوکمارک/موضع) همگی در ویرایشگر برمی‌گردند.
    window.addEventListener("keydown", (e) => {
      if (!editor || e.repeat) return;
      const tag = (e.target && e.target.tagName) || "";
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) return;
      if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3" || e.code === "Digit4") {
        e.preventDefault();
        editor.tile = Number(e.code.slice(5)) - 1;
        syncEditorPanel();
      } else if (e.code === "KeyE") {
        e.preventDefault();
        editor.tile = "erase";
        syncEditorPanel();
      } else if (e.code === "Equal" || e.code === "Minus") {
        e.preventDefault();
        const bi = BRUSHES.indexOf(editor.brush);
        const d = e.code === "Equal" ? 1 : -1;
        editor.brush = BRUSHES[(bi + d + BRUSHES.length) % BRUSHES.length];
        syncEditorPanel();
      }
    });
  })();
  return { openEditor, closeEditor, blankView, lazyTable, edStatus, edCounts, edRefreshTerrain, syncEditorPanel, edCellFromEvent, edPaintAt, edCheckPlayable, edReadName, getEditor: () => editor };
}
