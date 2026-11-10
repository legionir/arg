// ذخیره‌های بانام (0.247.0 — C-CLN-39): استخراج مکانیکی از game/main.js — بدون تغییر منطق.
export function createNamedSavePainter({ namedSaveList, listNamedSaves, t, faNum }) {
  async function paintNamedSaves() {
      if (!namedSaveList) return;
      let list = [];
      try { list = await listNamedSaves(); } catch (_) { list = []; }
      namedSaveList.innerHTML = "";
      if (!list.length) {
        const d = document.createElement("div");
        d.className = "lbl";
        d.dataset.i18n = "ui.save.namedEmpty";
        d.textContent = t("ui.save.namedEmpty");
        namedSaveList.appendChild(d);
        return;
      }
      for (const e of list) {
        const row = document.createElement("div");
        row.className = "opts";
        const nm = document.createElement("span");
        nm.className = "lbl";
        nm.textContent = e.name + " · t" + (e.tick == null ? "?" : faNum(e.tick));
        const lb = document.createElement("button");
        lb.type = "button";
        lb.dataset.i18n = "ui.save.load";
        lb.textContent = t("ui.save.load");
        lb.dataset.load = e.name;
        const db = document.createElement("button");
        db.type = "button";
        db.dataset.i18n = "ui.save.delete";
        db.textContent = t("ui.save.delete");
        db.dataset.del = e.name;
        row.appendChild(nm); row.appendChild(lb); row.appendChild(db);
        namedSaveList.appendChild(row);
      }
  }
  return paintNamedSaves;
}
