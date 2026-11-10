# Stronghold: Crusader Web — بازسازی وب‌محور

پروتوتایپ playable در `index.html` + منطق بازی در `game/`.

## وضعیت فعلی (0.235.0)

- نسخه: `src/arg/VERSION`؛ نقشه‌راه ۷فازی: `src/ROADMAP.md` (فاز ۶ بسته شد، فاز ۷ تمیزکاری در جریان)؛ ردیابی هر نسخه: `CHANGELOG.md` + `qa-plan.md`.
- سوئیت: 689 همگام + ۶ ناهمگام (`game/tests.js` رانر + `game/tests/*.js`)؛ هش مرجع ری‌پلی: `b621bd25`.
- ابزارها: `tools/` (اسکن i18n، صحنه مرجع، فازینگ شبکه، باندل ZIP، sync-server، desync-diff) — خالص و بدون وابستگی اجرایی.
- سرور شخصی: `server/` با `npm install` (وابستگی ws) در دیپلوی — وندور حذف شد (0.235.0)؛ `scratch/` فضای موقت نشست‌هاست (به‌جز `scratch/CURRENT_TASK.md` که رکورد کار است).
- سازنده زنده: `src/tools/gen-icons.js` (منبع شیت آیکون‌های `game/icons.gen.js`).


## اجرای برش اول (اکتبر ۲۰۲۶)

- گرید ایزومتریک ۳۲×۳۲ (Canvas2D)، زمین قطعی با seed ثابت: چمن/آب/سنگ.
- حلقه زمان گام‌ثابت ۱۰Hz مستقل از فریم‌ریت + توقف + سرعت ۱/۲/۴.
- ساخت کلبه (۲×۲) و برج (۳×۳) با اعتبارسنجی (مرز/زمین/اشغال) و دلیل رد فارسی.
- گوست سبز/قرمز، پنل چوب/غذا/طلا، شمارش ساخته/ردشده، FPS.
- کنترل: کلیک=ساخت، درگ=جابه‌جایی، چرخ=زوم، «نمایش کل نقشه»=ریست دوربین.

## ساختار کد

| فایل | مسئولیت |
|---|---|
| `game/config.js` | اعداد نسخه اول (placeholder، نه قوانین مرجع)؛ ساختمان‌ها از `data/buildings.json` (بند ۳) و بازار/صف آموزش از `data/tuning.json` (بند ۷) می‌آیند |
| `data/buildings.json` | تنها منبع حقیقت آمار ۲۱ ساختمان (فاز ۰ بند ۳): دسته/هزینه/کارگر/جای‌گذاری/نیازها — توازن را اینجا ویرایش کنید، بدون دست‌زدن به منطق |
| `data/units.json` | تنها منبع حقیقت آمار ۱۵ یگان (فاز ۰ بند ۴): building/goldCost/equip/hp/رده‌ها/پرچم‌ها — توازن را اینجا ویرایش کنید، بدون دست‌زدن به منطق |
| `data/balance.json` | جدول‌های مرجع توازن ۱۸.۲–۱۸.۸ (فاز ۰ بند ۵): HP/ضربات/سرعت/دیوار/محاصره/اقتصاد/امتیاز/TA با برچسب منشأ — امروز reference (سیم‌کشی با فازهای بعدی) |
| `data/tuning.json` | تنها منبع حقیقت تنظیمات پیاده‌شده sim (فاز ۰ بند ۷): مالیات/جیره/میخانه/زمان‌بندی/مسکن/سقف‌ها/بازار/صف — توازن را اینجا ویرایش کنید؛ مقادیر مرجع دفترچه در `data/balance.json` است |
| `game/data.js` | لودر داده — ساختمان + واحد + توازن + تنظیمات (fetch نسبی ماژول + getter تنبل نام + اعتبارسنج fail-fast) |
| `game/terrain.js` | تولید زمین قطعی — همه‌چیز از سید (دریاچه/سنگ/پراکنده، آینه‌ای) |
| `game/profile.js` | پروفایل بازیکن: نام + لوگو، ذخیره محلی، نشان roster |
| `game/state.js` | `GameState v0`: تیک، منابع، ساختمان‌ها، اشغال |
| `game/construction.js` | اعتبارسنجی + `tryPlace` |
| `game/clock.js` | ساعت گام‌ثابت با سقف جبران |
| `game/render.js` | رندر ایزومتریک: زمین بافت‌دار قطعی، ساختمان تایپ‌محور، واحد جهت‌دار، گوست حجمی، دوربین خودفیت (قرارداد مختصات پایدار — تست رفت‌وبرگشت) |
| `game/economy.js` | اقتصاد: نرخ‌های تک‌منبع از `CONFIG.BUILDINGS.econ`، سهمیه کارگر، سقف انبار، مصرف غذا، مالیات/جیره/محبوبیت/مهاجرت |
| `game/market.js` | بازار (0.64.0 — ب-۳): پیش‌فاکتور/اعتبارسنجی/اجرای خرید و فروش بسته‌ای با واسطه طلا از `CONFIG.MARKET` — دروازه بازار سالم خودی، بدون اتلاف سقف |
| `game/rng.js` | RNG مرکزی sim (mulberry32 با seed صریح — تنها منبع تصادف منطق) |
| `game/train.js` | صف آموزش (0.65.0 — انتخاب ۱-الف): سفارش/لغو/پیشرفت تحویل به‌ازای سربازخانه — هزینه اتمی، بازپرداخت با سقف، تحویل قطعی |
| `game/missions.js` | زیرساخت مأموریت (0.66.0 — انتخاب ۲-ج): اسکیما + اعتبارسنجی + run روی اسنپ‌شات؛ کاتالوگ خالی (محتوا پارک) — خالص، بدون سیم‌کشی |
| `game/cloud.js` | ذخیره ابری (0.67.0 — انتخاب ۳-الف): هش عبارت + API سوکت جدا (ذخیره/بارگذاری/حذف) روی همان بک‌اند سرور — آفلاین تمیز |
| `game/selfhost.js` | اجرای شخصی (0.69.0): سازنده سوکت (اول پلتفرم، وگرنه سرور شخصی با تقدم `?server`/localStorage/همین‌هاست) + آداپتور `rpc`/رویداد روی WebSocket — خالصِ تقدم آدرس، تست‌پذیر |
| `game/sim.js` | گام یکپارچه (`stepSim`) + صف فرمان سولو (`createQueue/enqueueCmd/applyCmd`) + گیت `aiPaused` (پرش stepAI پشت منو، 0.68.0) |
| `game/tests.js` | رانر سوئیت (689 همگام + ۶ ناهمگام؛ `runTests` یا `?test`) + ایمپورت سوئیت‌ها از `tests/` |
| `game/tests/` | سوئیت‌های استخراج‌شده (0.235.0 — C-CLN-1، بدون تغییر منطق): `fixtures.js` (must/fresh/mpFresh/هارنس headless سرور) + `tst-phase6.js` (فاز ۶) + (0.236.0: `server.js`/`mp.js`) + (0.237.0: `basics.js`/`sound.js`؛ `stubCtx` در fixtures) + (0.238.0: `gesture.js`/`mapedit.js`) + (0.239.0: `data.js`/`hardening.js`) + (0.240.0: `mission.js`/`keep.js`) + (0.241.0: `masters.js`/`cloud.js`) + (0.242.0: `train.js`/`wall.js`) + (0.243.0: `path.js`/`lord.js`؛ blankMap مشترک در fixtures) + (0.244.0: `gfx.js`/`balance.js`؛ siteNear مشترک در fixtures) + (0.245.0: `sim.js`/`replay.js`؛ REF_SOLO_001 مشترک در replay.js) + (0.246.0: `ai.js`/`const.js`؛ aiSim/aiFreshPers مشترک در fixtures) + (0.247.0: `combat.js`/`a11y.js`؛ grassInBand/placeGateAt مشترک در fixtures) + (0.248.0: `econ.js` (۸۱ تست + placeAll محلی) / `persist.js` (۲۱ تست)؛ putNear/snapOf/SPOTS_2X2/validate ترمیم شدند) + (0.249.0: `advisor.js` (۳۲ تست) / `sys.js` (۴۳ تست + findEnclosureSite محلی)) + (0.250.0: `costs.js` (۵ تست) / `fire.js` (۴ تست)) + (0.251.0: `truce.js` (۵ تست) / `arab.js` (۴ تست)) + (0.252.0: `ballista.js` (۳ تست) / `stance.js` (۵ تست)) + (0.253.0: `aggro.js` (۴ تست) / `fort.js` (۵ تست)) + (0.254.0: `tower.js` (۴ تست) / `gate.js` (۴ تست)) + (0.255.0: `gatecapture.js` (۷ تست) / `siege.js` (۳ تست)) + (0.256.0: `absence.js` (۴ تست) / `fortify.js` (۴ تست)) + (0.257.0: `orders.js` (۴ تست) / `attack.js` (۴ تست)) + (0.258.0: `patrol.js` (۴ تست) / `roads.js` (۳ تست)) + (0.259.0: `hire.js` (۳ تست) / `guilds.js` (۱ تست)) + (0.260.0: `stable.js` (۲ تست) / `troops.js` (۴ تست + ۱ مرده) + (0.261.0: `services.js` (۴ تست) / `idb.js` (۶ تست ناهمگام))) — هر سوئیت game/toolهای خودش را import می‌کند |
| `game/sprites.js` | رجیستری دارایی تصویری: کش + fallback وکتوری + آیکون HUD (`.gen.js`ها inline و بدون نیاز به شبکه‌اند) |
| `game/*.gen.js` | دارایی inline تولیدشده (دستی نزن؛ منبع: `assets/` + سازنده‌های `scratch/build-*.js`) |
| `game/persist.js` | ذخیره نسخه‌دار v2، اعتبارسنجی، مهاجرت v1→v2، بک‌اند localStorage |
| `game/combat.js` | واحدها (آمار از `data/units.json` — فاز ۰ بند ۴)، مسیریابی A* چهارجهته (fallback لغزش)، برد/خسارت قطعی، ویرانی، برج مسلح، موج دشمن (acquire ویران‌شده را نادیده می‌گیرد؛ resolveTarget تکراری با سقف) |
| `game/pathfind.js` | A* قطعی روی گرید + `nearestWalkable` (CORE-001) |
| `game/main.js` | سیم‌کشی UI و حلقه اصلی |
| `game/seed.js` | سید نقشه (0.238.0 — C-CLN-12): parseSeed/randomSeed خالص + paintSeed(state) |
| `game/profileui.js` | پروفایل نمایشی (0.239.0 — C-CLN-15): warName/warLogo/paintBadge/syncProfileInput با پارام profile + (0.261.0 — C-CLN-81): wireProfileUI({getProfile/setProfile, menuMsg, lobby}) مالک سیم‌کشی نام/لوگو |
| `game/modal.js` | مودال‌ها (0.241.0 — C-CLN-21): createModals(overlay, modals) با opener داخلی + open/close/toggle
| `game/flatview.js` | نمای تخت (0.242.0 — C-CLN-24): createFlatView(flatBtn, renderer) با paint/stored/apply
| `game/keybtns.js` | دکمه‌های کلیدها (0.246.0 — C-CLN-36): createKeyButtons({getKeyMap, getRecAction}) — هر دو getter چون در بوت reassign می‌شوند
| `game/minimapui.js` | مینی‌مپ (0.249.0 — C-CLN-45): createMinimapUI({renderer, getState/getTerrain/getEditor, blankView}) + tickMinimap برای خط فریم
| `game/mappreview.js` | پیش‌نمایش نقشه (0.250.0 — C-CLN-48): createMapPreviewUI({getSoloMapKey}) مالک paintMapPreview/paintMpMapPreview؛ wiring لابی در main.js
| `game/lobbyui.js` | نشست و فهرست‌های لابی (0.251.0 — C-CLN-51): createLobbyListUI({lobby, getMpSession, ...}) مالک ۵ هلپر نشست + ۷ painter؛ ۱۲ const تفویضی در main.js
| `game/replaybar.js` | نوار ری‌پلی (0.252.0 — C-CLN-54): createReplayBarUI({getReplayWatch/setReplayWatch, getTick, getMpSession, getRecLog}) مالک ۳ painter + const replayStatus؛ ۳ const تفویضی در main.js
| `game/scribeui.js` | کاتب و جدول افتخار (0.253.0 — C-CLN-57): createScribeUI({getState, getMpSession, viewSlotOf}) مالک reports/merit + wireScribe؛ ۳ const تفویضی در main.js
| `game/mpview.js` | نمای چندنفره (0.254.0 — C-CLN-60): createMpViewUI({getMpSession, getState}) مالک mpStatus/paintSync/paintMp/mpRosterHTML؛ ۴ const تفویضی در main.js
| `game/panelui.js` | پنل‌های نوار ساختمان (0.255.0 — C-CLN-63): createPanelUI({getState, getMpSession, ...}) مالک ۳ painter + show/hide/toggle/prune + wiring اورلی‌ها؛ ۱۱ const تفویضی در main.js + (0.264.0 — C-CLN-84): refreshPanel() داخلی (۲۸۰خط) + ۲۹ نام later-group + گتر/ستر جدید (setPendingKind)؛ ۱ const تفویضی در main.js |
| `game/editorui.js` | ویرایشگر نقشه (0.256.0 — C-CLN-66): createEditorUI({...}) مالک editor + ۱۳ تابع + wiring کامل؛ گتر getEditor + ۸ const تفویضی در main.js
| `game/missionui.js` | مأموریت و استادان (0.257.0 — C-CLN-69): createMissionUI({...}) مالک ۸ let + ۱۰ تابع؛ ۵ گتر/۵ ستر + ۶ const تفویضی در main.js
| `game/watchui.js` | تماشا و بارگذاری (0.258.0 — C-CLN-72): createWatchUI({...}) مالک ۴ تابع؛ ۲۲ ستر + ۵ گتر + ۴ const تفویضی در main.js
| `game/newgame.js` | شروع بازی تازه (0.263.0 — C-CLN-83): startNewGame({...}) مالک newGame؛ ۲۳ ستر + ۵ گتر + thunk گروهی later + ۹ ارجاع مستقیم
| `game/tickhooks.js` | قلاب‌های view-side هر تیک (0.259.0 — C-CLN-75): createTickHooks({...}) مالک tickViewHooks؛ ۳ گتر + ۲ جفت گتر/ستر + ۴ thunk (تعریف‌های بعدی)؛ ۱ const تفویضی در main.js
| `game/menuui.js` | منو و بازگشت به بازی (0.260.0 — C-CLN-78): createMenuUI({...}) مالک menuMsg/showMenu/hideMenu + menuRelabelFns/menuStarted/menuNavApi؛ ۲ گتر + ۱ ستر + sound/renderer/refreshPanel مستقیم؛ ۷ const تفویضی در main.js + (0.262.0 — C-CLN-82): wireMenuUI({...}) مالک سیم‌کشی منوی شروع؛ ۸ جفت گتر/ستر + ۴ گتر + ۱ thunk + ۱۴ ارجاع مستقیم |
| `game/pointerui.js` | تعامل اشاره‌گر (0.265.0 — C-CLN-85): createPointerInput({...}) مالک درگ/کلیک/باکس/خط‌دیوار/پینچ/لانگ‌پرس + ۱۰ لیسنر بوم؛ ۲۳ داخلی + ۱۲ گتر/ستر + later برای ۳ نام پس‌تعریف + ۱۵ ارجاع مستقیم؛ clearWallLine/hideBox + ۳ گتر از factory
| `game/paletteui.js` | پالت ساختمان/مزدور + شیلدهای دسته (0.248.0 — C-CLN-42): createPaletteUI({renderer, PALETTE}) مالک catFilter + wiring؛ ۶ متغیر مأموریت/استادان در main ماندند
| `game/palettekeys.js` | سیم‌کشی پالت/کلیدها (0.266.0 — C-CLN-86): createPaletteKeysUI({...}) مالک هایلایت/پالت/ارتش/یگان/keydown + keyUI/keyRecAction داخلی و expose؛ ۱۸ import + later برای ۷ نام پس‌تعریف |
| `game/ordersui.js` | دکمه‌های سفارش (0.267.0 — C-CLN-87): createOrdersUI({...}) مالک مودال/صدا/کارت‌ها/۱۹ دکمه + selUnits/orderStance مالک و expose + ۲۴ const تفویضی؛ ۱۵ import + later برای ۴ نام |
| `game/savemenu.js` | بازی/منو/ذخیره (0.268.0 — C-CLN-88): createSaveMenuUI({...}) مالک newGame + کارت سید + missionUI/menuUI + ذخیره دستی/خودکار/بانام؛ ۲۵ import + ۱۵ گتر/۲۸ ستر + later برای ۴ نام + ۲۴ ارجاع مستقیم؛ ۲۱ const تفویضی در main.js |
| `game/cloudreplay.js` | ابر/ری‌پلی (0.269.0 — C-CLN-89): createCloudReplayUI({...}) مالک سیم‌کشی ابر + دکمه‌های ری‌پلی؛ ۶ import + ۴ گتر + later برای ۵ نام (تنبل داخل لیسنرها) + ‎`$`‎ مستقیم؛ بدون const تفویضی |
| `game/lobbywiring.js` | لابی رقابتی (0.270.0 — C-CLN-90): createLobbyWiringUI({...}) مالک دکمه‌های لابی + کارت ادامه + `mpCode()` + `continueStored()`؛ ۴ import + ۱ گتر + ۸ ارجاع مستقیم؛ ۷ const تفویضی در main.js |
| `game/viewframe.js` | نما/قاب (0.271.0 — C-CLN-91): createViewFrameUI({...}) مالک ریسایز + نمای تخت + minimap + حلقه `frame()`؛ ۶ import + ۷ گتر/۲ ستر + ۲۴ ارجاع مستقیم؛ ۳ const تفویضی در main.js |
| `game/boottail.js` | دم بوت (0.272.0 — C-CLN-92): createBootTail({...}) مالک شروع پشت منو + نسخه + مهاجرت IDB + `onLangChange` + شروع فریم؛ ۴ import + ۳ گتر + ۲۵ ارجاع مستقیم؛ بدون const تفویضی |
| `game/testhook.js` | قلاب تست (0.273.0 — C-CLN-93): createTestHookUI({...}) مالک `window.__slice01` (۵۲ کلید)؛ ۲۰ import + ۹ گتر/۹ ستر + ۳۰ ارجاع مستقیم؛ main.js دیگر قلاب ندارد |
| `game/namedsave.js` | ذخیره بانام (0.247.0 — C-CLN-39): createNamedSavePainter({namedSaveList, listNamedSaves, t, faNum}) — همان نام paint؛ ۴ فراخوانی بی‌تغییر
| `game/soundui.js` | دکمه صدا (0.245.0 — C-CLN-33): createSoundUI({sound, soundIconBtn, volMusic, volSfx, volMute}) با paint اولیه + wiring لیسنرها
| `game/policy.js` | سیاست و برچسب پالت (0.244.0 — C-CLN-30): relabelPalette + createPolicyPainters({taxBtns, ratBtns, getState}) با sgn داخلی
| `game/warn.js` | هشدار مشاور + خط اردو (0.243.0 — C-CLN-27): warnText خالص + createWarnLines({getState, sound}) مالک lastWarnKeys
| `game/testui.js` | رابط آزمون خودکار (0.240.0 — C-CLN-18): showTests/paintTestResults/paintCompat با پارام testBadge
| `game/format.js` | قالب‌بندی خالص پالت/کارت‌ها (0.237.0 — C-CLN-9): faNum/escName/costHTML/buildingMeta/unitMeta و … — بدون وضعیت بازی |
| `game/menunav.js` | ناوبری منوی چندصفحه‌ای (0.70.0): صفحه اول = فهرست بخش‌ها؛ پشته صفحه‌ها خالص + اتصال DOM |
| `game/hints.js` | راهنمای «هدف بعدی» (0.70.0): نقاط عطف شروع، خالص |
| `game/advisor.js` | مشاور نمایشی (0.79.0 — بند ۹): اطلاعات سیاست از TUNING + ۵ هشدار اولویت‌دار، خالص و فقط‌خواندنی |
| `game/sound.js` | صدای سنتزی: جلوه‌ها + رابط + موسیقی مولد دو حالته (0.70.0) |
| `game/selection.js` | انتخاب گروهی (مجموعه id + دستور/موضع جمعی) — خالص و تست‌پذیر |
| `game/groups.js` | گروه‌های کنترلی ۱..۳ (ذخیره Ctrl+شماره، فراخوانی با هرس زنده‌ها) — خالص و تست‌پذیر |
| `game/legal.js` | اسکن حقوقی: فهرست ۸ شناسه + scanBanned/scanContent — خالص و تست‌پذیر |
| `game/firstten.js` | سناریوی «۱۰ دقیقه اول» (headless + گزارش + دود سوئیت) — قلاب `firstTen` |
| `game/mp.js` | نبرد رقابتی: ثابت‌ها، اسپاون گوشه‌ها، اقتصاد جدا، هش desync، برد آخرین بازمانده |
| `game/lobby.js` | لابی MP: سوکت جدا، ساخت/پیوستن/آماده/شروع، ارسال ورودی نوبتی + اتصال‌مجدد/تماشا/فهرست زنده (0.141.0: توکن، sync، ردیف‌های live/mine، نشست خالص) |
| `server/` | اجرای شخصی: `server.mjs` (استاتیک + سوکت) + `game-logic.js` (آینه سرور `index.html`) + `package.json` (وابستگی ws؛ نصب با `npm install` در دیپلوی — وندور `node_modules/ws` حذف شد، 0.235.0) + `README.md` راهنمای دیپلوی |

## اسناد

- `stranghold-visual.md` — دستورالعمل گذر بصری (اجرا شد → 0.8.0).
- `assets/art-direction.md` — جهت هنری واقعی (پالت/نور/مقیاس/لنگر).
- `assets/manifest.json` — مانیفست دارایی‌ها + نتیجه اعتبارسنجی ماشینی (۲۱/۲۱).

- `idea-bank-spec.md` — چارچوب بانک ایده (اسکیما، نه دیتا).
- `idea-template.md` — قالب ۲ دقیقه‌ای ثبت ایده.
- `ideas/` — ۸ ایده، هر ۸ `in_progress` (برش ششم: CORE-001 مسیریابی A*).

## قدم بعدی پیشنهادی

فرماندهی یگان (موضع/تعقیب/عقب‌نشینی + انتخاب کلیکی)، تحقیق اعداد مرجع
(0.12.0)، دروازه باز/بسته‌شونده (0.13.0) و توازن مرجع سرعت/HP/هزینه + رشوه
(0.14.0)، نگهبانی ساختمان (0.15.0)، انتخاب گروهی (0.16.0)، زنگ خطر (0.17.0)
و اقتصاد سنگ (0.18.0)، ستاد یکتا با شرط شکست (0.19.0)، زنجیره نانوایی
(0.20.0) و زنجیره آبجو/میخانه (0.21.0)، ارباب یکتا با شرط پیروزی/شکست مضاعف (0.22.0) و لایه آنلاین (حاضران + تالار پیروزی مشترک، 0.23.0) و نبرد رقابتی ۲ تا ۴ نفره با شروع هم‌زمان (اتاق FFA، آخرین قلعه زنده، 0.24.0) و نقشه بزرگ چهارنفره ۴۸×۴۸ با تایل کوچک‌تر (0.25.0) و دکمه نمای تخت برای دیدن پشت ساختمان‌ها (0.25.1) و نقشه ۶۴×۶۴ متقارن با سید انتخابی (0.26.0) و نقشه کاملاً سیدمحور با منوی شروع و پروفایل بازیکن (0.27.0) و فهرست اتاق‌ها با اتاق خصوصی رمزدار (0.28.0) و سربازخانه به‌عنوان پیش‌نیاز استخدام سرباز (0.29.0) و قفل کماندار پشت سربازخانه + نوار افقی ساختمان در پایین صفحه (0.30.0) و مودال‌های ذخیره/راهنما/آنلاین با آیکون‌های نوار پایین (0.31.0) و آمار ثابت در نوار ساختمان + آیکون زنگ خطر (0.32.0) و مودال مالیات + نوار مزدورها با کلیک سربازخانه (0.33.0) و سربازخانه یکتا + انبار و انبار غذا با سقف پلکانی (0.34.0) و ۵ مزدور با نیزه‌دار/گرزدار/شوالیه (0.35.0) و ۱۰ مزدور با موج دوم از tier کاربر: شمشیرزن صلیبی/زوبین‌دار/شمشیرزن عرب/قاتل/کماندار سواره (0.36.0) تمام شد. سپس هسته قطعی sim: صف فرمان سولو + گام یکپارچه + هش کامل (0.37.0) تمام شد و زنجیره نان سه‌حلقه‌ای با آسیاب/آرد + نرخ‌های تک‌منبع از CONFIG (0.38.0) تمام شد و ساخت تدریجی با داربست + تخریب دستی با دکمه 🧨 (0.39.0) تمام شد و انتخاب باکسی با شیفت+درگ (0.40.0) تمام شد و زره رسمی با فرمول max(1, حمله−زره) + برچسب منبع اعداد (0.41.0) تمام شد و حریف AI سولو با پایگاه خودکار + سه یورش (0.42.0) تمام شد و مینی‌مپ ۱۵۰×۱۵۰ با کلیک=پرش دوربین (0.43.0) تمام شد و زنجیره سلاح با معدن آهن/زرادخانه/کمان‌سازی + قفل NEEDS_WEAPON استخدام (0.44.0) تمام شد و گاریسون برج با ۴ مدافع دوربرد + شلیک تقویتی برد+۲ (0.45.0) تمام شد و تجهیزات محاصره با دژکوب فقط‌ساختمان + منجنیق مستقرشونده (0.46.0) تمام شد. هر ۵ مورد NEXT-5 کامل شد و درگ خط دیوار با پیش‌نمایش اعتبارسنجی + ساخت زنجیره‌ای تا ۳۲ خانه (0.47.0) تمام شد و صدای سنتزشده بدون فایل با تغذیه اسنپ‌شات + دکمه میوت (0.48.0) تمام شد و ری‌پلی از لاگ فرمان با تأیید هش + تماشای watch-only (0.49.0) تمام شد و درجه سختی حریف AI با سه سطح آسان/معمولی/سخت + ماندگاری در ذخیره/ری‌پلی (0.50.0) تمام شد و نقشه‌ساز داخل‌بازی با سند سید+وصله + نقاشی روی بوم + بررسی قابل‌بازی + ذخیره/خروجی/ورودی + آزمایش بازی (0.51.0) تمام شد و ۳ نقشه نام‌دار با سلکت منو + ماندگاری + نام در کارت سید (0.52.0) تمام شد و پینچ-زوم دو انگشتی + لمس طولانی = خلع با ماژول خالص gestures (0.53.0) تمام شد و اسکیمای رسمی کاتالوگ‌ها با validateConfig در boot و سوئیت (0.54.0) تمام شد و بک‌اند IndexedDB با مهاجرت یک‌بار + سقف ۴MB + فاز تست جدا (0.55.0) تمام شد و ۵ شخصیت حریف با سلکت منو + ماندگاری در ذخیره/ری‌پلی (0.56.0) تمام شد و پالت کمکی کوررنگی + مقیاس UI تا ۱۵۰٪ + remap کلید (0.57.0) تمام شد و fidelity سه‌وضعیتی + بنچمارک/بودجه + رگرسیون ۸ هش + فاز + ماتریس سازگاری (0.58.0) تمام شد و گروه‌های کنترلی یگان‌ها با Ctrl+1/2/3 ذخیره + 1/2/3 فراخوانی (0.59.0) تمام شد و اسکن حقوقی خودکار ۸ شناسه + بلوک اعتبارها در راهنما (0.60.0) تمام شد و نام محصول «ارگ (Arg)» در هر ۳ جای shipped + اسکن صفر برخورد (0.60.1) تمام شد و خط پشتیبانی Chrome/Firefox + سناریوی ۱۰ دقیقه با گزارش + جدول تطبیق ویکی (0.61.0) تمام شد.
