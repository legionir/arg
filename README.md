# ارگ (Arg)

بازی استراتژی هم‌زمان قلعه‌سازی در مرورگر، در دنیای خیالی «سرزمین هفت‌باد»: واحه‌ات را آباد کن،
ارگ بساز، زنجیره‌های اقتصاد را راه بینداز و در برابر هفت فرمانروای رقیب بایست. فارسی و انگلیسی،
تک‌نفره (نبرد آزاد و کمپین) و چندنفره تا ۴ بازیکن.

دنیا، شخصیت‌ها و واژگان بازی در `assets/world.md` تعریف شده‌اند.

## اجرا

```bash
cd server && npm install && node server.mjs
```

سپس `http://localhost:8080/` را باز کنید (`PORT` برای تغییر پورت). بازی ES module است و باید از طریق
سرور باز شود، نه `file://`. جزئیات دیپلوی در `server/README.md`.

## تست

```bash
node .claude/skills/run-arg/driver.mjs tests
```

سوئیت درون مرورگر اجرا می‌شود (Playwright + Chromium). برای اسکرین‌شات:
`node .claude/skills/run-arg/driver.mjs shot --lang fa --solo --out shot.png`.

## ساختار

| مسیر | محتوا |
|---|---|
| `index.html`، `styles/` | صفحه، منو و HUD؛ توکن‌های طراحی در `styles/tokens.css` |
| `game/` | منطق و رندر. هسته‌ی قطعی: `sim.js`، `economy.js`، `combat.js`، `ai.js`، `pathfind.js`؛ رندر Canvas2D: `render.js`؛ رابط: فایل‌های `*ui.js` |
| `game/lang/` | همه‌ی متن‌ها (fa/en) |
| `game/tests/` | سوئیت‌ها؛ رانر در `game/tests.js` |
| `data/` | کاتالوگ‌های داده‌محور: بناها، یگان‌ها، تنظیمات، مأموریت‌ها |
| `assets/` | فونت‌ها، کاشی‌ها، شیت یگان‌ها، پرتره‌ها، سند دنیا و جهت هنری |
| `server/` | سرور Node: فایل استاتیک + WebSocket برای چندنفره، تالار و ذخیره‌ی ابری |
| `tools/` | سازنده‌ها (`gen-portraits.mjs`، `gen-units.js`، `gen-icons.js`) و ابزارهای کنترل (`i18n-scan`، `sync-server`، `make-bundle`، `e2e-mp4`) |

## قواعد توسعه

- هر تغییر: کد + تست + `CHANGELOG.md` + ردیف `qa-plan.md` + `VERSION` (`release-process.md`).
- `server/game-logic.js` آینه‌ی بلوک سرور داخل `index.html` است: `node tools/sync-server.mjs --check`.
- `game/*.gen.js` دارایی تولیدشده است و دستی ویرایش نمی‌شود.
- متن جدید همیشه دوزبانه در `game/lang/`.
- محتوا اورجینال می‌ماند: تست «هویت اورجینال» (`game/tests/basics.js`) همه‌ی متن‌های بازی را اسکن می‌کند.

نقشه‌راه در `ROADMAP.md` و تاریخچه‌ی نسخه‌ها در `CHANGELOG.md` است.

## اعتبارها و مجوزها

- **کد و آثار هنری:** همه‌ی کد، کاشی‌ها، شیت یگان‌ها، پرتره‌ها و آیکون‌ها را خود پروژه تولید کرده است (سازنده‌های `tools/`)؛ دنیا و شخصیت‌ها اورجینال‌اند (`assets/world.md`).
- **تصاویر تولیدشده با هوش مصنوعی (پایلوت):** سه ساختمان (`assets/buildings/`) و دو پرتره (`artan`، `tirazheh`) با مدل `flux-1-schnell` (Cloudflare Workers AI) ساخته و پردازش شده‌اند (`tools/ai-art/README.md`). مجوز و شرایط استفاده‌ی تجاری مدل را پیش از انتشار عمومی از کارت مدل تأیید کنید.
- **فونت‌ها:** [Vazirmatn](https://github.com/rastikerdar/vazirmatn) (SIL OFL 1.1) و [Inter](https://rsms.me/inter/) (SIL OFL 1.1)؛ متن مجوزها در `assets/fonts/LICENSE-*.txt`.
- **وابستگی سرور:** تنها پکیج `ws` (MIT).
- **کاشی‌ها، پرتره‌ها و نقشه‌های ساخته‌شده توسط بازیکن:** فروش یا استفاده‌ی تجاری نقشه‌ها ممنوع است (متن در ویرایشگر نقشه).
