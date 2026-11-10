# نقشه‌راه پسا-۴۵۹ — ارگ (Arg)

چک‌لیست ۴۵۹ ردیفی کامل است (0.222.0). این سند ۷ فاز بعدی را به ترتیب اولویت تعریف می‌کند.
قاعده هر فاز مثل قبل: **کد + تست + سند + لایو**؛ ردیابی با ردیف qa-plan (`C-MOB-*`، `C-CMP-*`، …) + CHANGELOG + نسخه، نه چک‌لیست قفل‌شده.
تصحیح مهم: اتصال‌مجدد خودکار چندنفره (backoff + توکن + `mpRejoin` + `mpSync` + «بازی‌های من») از 0.141.0 هست — پس فاز سرور فقط سخت‌سازی است، نه reconnect.

## فاز ۱ — موبایل/ریسپانسیو (P0) — تمام شد (0.223.0: C-MOB-1/2/3 + 0.224.0: C-MOB-4/5/6)
وضعیت (تأییدشده، نه حدسی): viewport درست؛ Pointer Events؛ پینچ/لمس‌طولانی (`game/gestures.js` + سوئیت `gestureCases`)؛ DPR سقف ۲؛ مدیاکوئری 800/480px و `pointer:coarse` (۴۴px)؛ متن راهنمای ژست دوزبانه (fa/en)؛ انتخاب کیفیت `fidSel` (full/balanced/lite) + افت خودکار با fps + FPSسنج — همه از قبل بودند. بدون اسکرول افقی در 390px.
انجام شد در 0.223.0:
- [x] `touch-action:none` روی `#board` (+`#minimap` از قبل) + `overscroll:none` بدنه + `manipulation` دکمه‌ها (C-MOB-1)
- [x] سقف DPR کیفیت‌محور `dprCapFor` (lite=۱، balanced=۱٫۵، full=۲) در `resize` (C-MOB-2)
- [x] قفل بیداری نبرد `game/wakelock.js` + سیم‌کشی hideMenu/showMenu/visibilitychange (C-MOB-3)
انجام شد در 0.224.0:
- [x] تراکم HUD در 390px: دکمه ☰ در 480px + کلید `hud-open` + `game/mobilehud.js` (C-MOB-4)
- [x] نقشه تمام‌صفحه + پنل کشویی: دکمه ▲ + کلید `sheet-open` (شیت ۵۲dvh) + `game/mobilesheet.js` (C-MOB-5)
- [x] بنچ موبایل: `MOBILE_BENCH_TICKS=۱۲۰` + قطعیت + کران کش اسپرایت (C-MOB-6)
پذیرش: ردیف‌های `C-MOB-*` (۱ تا ۶ سبز، سوئیت 656/656) + پروب زنده 390px (نوار جمع/باز + شیت) و 1920px (بی‌تغییر). فاز ۱ بسته شد — بعد: فاز ۲ کمپین.
## فاز ۲ — کمپین تاریخی (P1) — شروع شد (0.225.0: C-CMP-1/2/3 انجام شد)
وضعیت: `MISSIONS` خالی عمدی (تصمیم 0.61.0)؛ فقط الفبای مأموریت (`game/missions.js`: اسکیما + اعتبارسنجی + اجراکننده)؛ منو: home/solo/mp/masters/profile/settings.
کارها:
- [x] کاتالوگ ۶ مأموریت (صلاح‌الدین/شیر/محاصره/پاسگاه/زنجیره نان/گام نخست) با seed/difficulty/personality/identity، داده‌محور در `data/missions.json` + تست اسکیما/ارجاع (C-CMP-1)
- [x] صفحه کمپین در منو (هفتمین صفحه + i18n دو‌زبانه) + قفل‌گشایی پیشرونده (localStorage، الگوی `masters.js`) + رندر ۶ ردیف با قفل (C-CMP-2)
- [x] برد/باخت view-side در main.js (بدون میدان sim — هش سولو دست‌نخورده) + بنر پایان + رکورد masters با map=«campaign:key» (C-CMP-3)
- [x] نمایش/فیلتر per-مأموریت در تالار استادان + ری‌پلی یک مأموریت (0.226.0: C-CMP-4/5/6).
پذیرش (0.226.0): C-CMP-4/5/6 سبز + سوئیت 662/662 + تماشای زنده ری‌پلی مأموریت اول. مانده فاز ۲: ندارد — بعد: فاز ۳ بالانس.

## فاز ۳ — بالانس داده‌محور (P2)
وضعیت: `data/balance.json` (۱۳ manbook + ۲۷ fixup + ۵۰ منبع دیگر)، `data/tuning.json` (۹ guess)؛ بنچ با بودجه گشاد؛ تست AI-دربرابر-AI (ردیف 1254) هست ولی تورنمنت نیست.
کارها:
- [x] ماتریس دوئل همه‌به‌همه واحدها (0.227.0: C-BAL-1 زیرساخت + جدول `research/duel-matrix.md`؛ C-BAL-2 سه عدد: knight hp، horseArcher hp/dmg، crusader cost).
- [x] شبیه‌سازی ۳۰دقیقه‌ای زنجیره‌های اقتصاد (0.227.0: C-BAL-3 — اندازه‌گیری + پین `t_econ_chain` + اصلاح ردیف‌های کهنه؛ تبدیل‌ها با مرجع هم‌ترازند).
- [x] تورنمنت ۷ شخصیت (0.228.0: C-BAL-4 بنچمارک رخنه keep-only + جدول `research/tournament.md`؛ شیر ۱۷۰۱ تا موش ۲۸۵۸، ترتیب پایدار) + اصلاح side=enemy یورش عرب + سربازخانه موش (پیش از این عرب خودزنی/موش تماشاچی بودند — همیشه-بازنده/تماشاچی رفع شد؛ ضریب‌ها بی‌تغییر).
- [x] کالیبره easy/normal/hard با داده رخنه (0.228.0: C-BAL-5 آسان ~۳۰۰۰/معمولی ~۲۲۰۰/سخت ~۱۵۶۰، یکنوا — ضریب‌ها بی‌تغییر) + تقارن شروع ۲/۳/۴نفره (0.228.0: C-BAL-6 منابع شعاع ۱۲ هر ۴ لنگر در ۵ سید یکسان — بی‌تغییر).
پذیرش (0.228.0): C-BAL-4/5/6 سبز + سوئیت 667/667 + جدول تورنمنت + ۲ اصلاح رفتار مستند + هش مرجع بی‌تغییر (b621bd25). مانده فاز ۳: ندارد — بعد: فاز ۴ گرافیک.

## فاز ۴ — پرداخت گرافیکی (P3)
وضعیت: Canvas2D ایزو، سایه (۳۴ مورد)، شیت ۱۴ واحد (۴جهت×۴حالت+مرگ)؛ نه شب/روز، نه آب‌وهوا، نه ذره.
کارها:
- [x] موتور ذره سبک (0.229.0: C-GFX-1 دود/آتش/گرد/پاشش قطعی و سقف‌دار + fidelity-gated).
- [x] چرخه شب/روز (0.229.0: C-GFX-2 تینت + هاله آتش‌ها + سلکت day/night/cycle؛ پیش‌فرض روز — بدون اثر sim).
- [x] آب متحرک + کف ساحل (0.229.0: C-GFX-3 نوار برق per-frame + کف ۴فازی).
- [x] مراحل ساخت (0.230.0: C-GFX-4 پی/اسکلت/نزدیک‌تمام) + سایه نرم واحدها (0.230.0: C-GFX-5) + بازطراحی ۱۵ آیکون (0.230.0: C-GFX-6 `src/tools/gen-icons.js`).
پذیرش: ردیف‌های `C-GFX-1..6` سبز + سوئیت 673/673 + بنچ در بودجه (افت خودکار نگهبان). مانده فاز ۴: ندارد — بعد: فاز ۵ سرور.

## فاز ۵ — سخت‌سازی سرور (P4)
وضعیت: `server.mjs` + `game-logic.js` (آینه اسکریپت داخل HTML) + README (systemd، نرخ‌محدود، WS_MAX_PER_IP) + `selfhost.js` (`?server=`)؛ E2E چهارمرورگری سبز (۱۸۳ مقایسه، ۰ ناهمخوانی). reconnect/resync کامل است (0.141.0).
کارها:
- [x] اعتبارسنجی ورودی (0.231.0 — C-SRV-1): پنجره تیک (پسرفت فراتر از ۱۰۰ رد) + نرخ هر اسلات ۴۰/۱۰ثانیه (قطع/وصل مجدد دور نمی‌زند) + اسکیمای آرگومان هر kind + افزودن rally/disband به MP_KINDS (باگ زنده: کلاینت می‌فرستاد، سرور رد می‌کرد).
- [x] دامپ خودکار ناهمخوانی (0.231.0 — C-SRV-2): گزارش mpDesync + حلقه ۲۰تایی + دامپ data/desync/<CODE>.jsonl (سرور شخصی) + ابزار tools/desync-diff (+ هسته خالص desync-lib).
- [x] ابزار sync-server (0.231.0 — C-SRV-3): tools/sync-server.mjs (+ کتابخانه خالص sync-server-lib) تولید game-logic.js و آینه ریشه + --check برای CI + پین t_srv_mirror.
- [x] اسکریپت باندل دیپلوی (0.232.0 — C-SRV-4): `tools/make-bundle.mjs` (+ کتابخانه خالص `zip-store-lib`: stored + CRC32) — خروجی `scratch/arg-server-bundle.zip` + پین `t_srv_bundle`.
- [x] بکاپ چرخشی `state.bin` (0.232.0 — C-SRV-5): بکاپ ساعتی در `data/backup/` (نگه‌داشت ۶تای آخر، `STATE_BACKUP_KEEP`) + سقف اتاق فعال `MP_LIVE_MAX=24` (گیت `mpStart` با `full`؛ اتاق تمام‌شده سهم ندارد) + پین `t_srv_livecap`.
پذیرش: ردیف‌های `C-SRV-*` + E2E پس از تغییر + تست تزریق ورودی خراب.

## فاز ۶ — تست‌های بیشتر (P5)
وضعیت: ۶۵۶ تابع در ۲۹ سوئیت؛ سوراخ‌ها: `sprites`/`online`/`lazy`/`main` (به‌عنوان ماژول)، `*.gen.js`، E2E قدیمی (گزارش مال 0.70.2).
کارها:
- [x] رگرسیون تصویری (0.234.0: C-TST-4 — `tools/refscene-lib.mjs` + `data/ref-scene.json` + پین `t_tst_refscene`).
- [x] تازه‌سازی E2E چهارنفره (0.234.0: C-TST-5 — پین headless `t_tst_mp4` + هدر `e2e-mp4.mjs` + `research/e2e-4p.md`) + اجرای دوره‌ای.
- [x] فازینگ شبکه (0.234.0: C-TST-6 — `tools/netfuzz-lib.mjs` + پین `t_tst_netfuzz`) روی lockstep.
- [x] اسکن i18n (0.233.0: C-TST-1 فیکس dup + `tools/i18n-scan` + پین `t_tst_i18n`).
- [x] مهاجرت ذخیره نسخه‌به‌نسخه (0.233.0: C-TST-2 `MIGRATIONS`+`migrateSaveDoc` + پین) + تست حافظه (0.233.0: C-TST-3 کران کش اسپرایت) + بودجه واقعی موبایل در `bench.js` (0.233.0: C-TST-3 `benchMobile()` + پین).
پذیرش (0.234.0): ردیف‌های `C-TST-4/5/6` سبز + سوئیت 689/689 + هش مرجع بی‌تغییر (b621bd25). مانده فاز ۶: ندارد — بعد: فاز ۷ تمیزکاری.

## فاز ۷ — تمیزکاری فنی (P6 — آخر، پرریسک‌ترین)
وضعیت: صفر TODO؛ بدهی در ساختار: `game/tests.js` (۱٫۱۵MB)، `game/main.js` (۲۵۸KB)، آینه‌های دستی سرور، وندور `server/node_modules/ws`.
کارها:
- [x] شکستن `tests.js` به `tests/*.js` (0.235.0: C-CLN-1 — `fixtures.js` + `tst-phase6.js`؛ 0.236.0: C-CLN-4/5/6 — `server.js`/`mp.js`/تجمیع هلپرها؛ 0.237.0: C-CLN-7/8 — `basics.js`/`sound.js` + export شدن `stubCtx`؛ 0.238.0: C-CLN-10/11 — `gesture.js`/`mapedit.js`؛ 0.239.0: C-CLN-13/14 — `data.js`/`hardening.js`؛ 0.240.0: C-CLN-16/17 — `mission.js`/`keep.js`؛ 0.241.0: C-CLN-19/20 — `masters.js`/`cloud.js` (بازیابی حذف تصادفی از 0.236 + اسکنر آگاه)؛ 0.242.0: C-CLN-22/23 — `train.js`/`wall.js`؛ 0.243.0: C-CLN-25/26 — `path.js`/`lord.js` (+ انتقال blankMap مشترک به fixtures)؛ 0.244.0: C-CLN-28/29 — `gfx.js`/`balance.js` (+ انتقال siteNear مشترک به fixtures)؛ 0.245.0: C-CLN-31/32 — `sim.js`/`replay.js` (+ انتقال REF_SOLO_001 مشترک)؛ 0.246.0: C-CLN-34/35 — `ai.js`/`const.js` (+ انتقال aiSim/aiFreshPers مشترک به fixtures)؛ 0.247.0: C-CLN-37/38 — `combat.js`/`a11y.js` (+ انتقال grassInBand/placeGateAt مشترک به fixtures)؛ بدون تغییر منطق، بی‌چرخه)؛ 0.259.0: C-CLN-73/74 — `hire.js`/`guilds.js`؛ 0.260.0: C-CLN-76/77 — `stable.js`/`troops.js`؛ 0.261.0: C-CLN-79/80 — `services.js`/`idb.js` (پایان استخراج سوئیت‌ها؛ `tests.js` فقط رانر + ۳۶۰ خط).
- [~] جدا کردن لابی/نقشه/نبرد از `main.js` به ماژول (0.237.0: C-CLN-9 — خوشه قالب `game/format.js`؛ 0.238.0: C-CLN-12 — ماژول سید `game/seed.js` + فیکس حبس `paintMapPreview`؛ 0.239.0: C-CLN-15 — ماژول پروفایل `game/profileui.js` (late binding لابی با thunk)؛ main.js ۴۷۵۱ خط؛ 0.240.0: C-CLN-18 — ماژول آزمون `game/testui.js` (پارام testBadge + ۴ سیم‌کشی)؛ 0.241.0: C-CLN-21 — ماژول مودال `game/modal.js` (opener داخلی + ۶ سیم‌کشی)؛ 0.242.0: C-CLN-24 — ماژول flatview در `game/flatview.js` (factory + ۷ سیم‌کشی)؛ 0.243.0: C-CLN-27 — ماژول هشدار `game/warn.js` (warnText + factory مالک lastWarnKeys + ۲ سیم‌کشی)؛ main.js ۴۷۱۸ خط؛ 0.244.0: C-CLN-30 — ماژول سیاست `game/policy.js` (relabel + factory مالک sgn + ۴ سیم‌کشی)؛ main.js ۴۶۷۶ خط؛ 0.245.0: C-CLN-33 — ماژول صدا `game/soundui.js` (paint اولیه + wiring + ۱ سیم‌کشی)؛ main.js ۴۶۵۶ خط؛ 0.246.0: C-CLN-36 — ماژول دکمه‌های کلید `game/keybtns.js` (factory با ۲ getter + ۴ سیم‌کشی)؛ main.js ۴۶۵۲ خط؛ 0.247.0: C-CLN-39 — ماژول ذخیره بانام `game/namedsave.js` (factory + همان نام paint + ۴ فراخوانی بی‌تغییر)؛ main.js 4510 خط (0.249.0: C-CLN-43/44/45 — سوئیت‌های advisor/sys + ماژول minimapui)؛ 0.250.0: C-CLN-46/47 — سوئیت‌های `costs.js`/`fire.js` + C-CLN-48 — ماژول پیش‌نمایش نقشه `game/mappreview.js`؛ main.js 1170 خط (0.273.0: C-CLN-93 — قلاب تست در `game/testhook.js`)؛ main.js 1385 خط (0.272.0: C-CLN-92 — دم بوت در `game/boottail.js`)؛ main.js 1438 خط (0.271.0: C-CLN-91 — نما/قاب در `game/viewframe.js`)؛ main.js 1528 خط (0.270.0: C-CLN-90 — لابی رقابتی در `game/lobbywiring.js`)؛ main.js 1690 خط (0.269.0: C-CLN-89 — ابر/ری‌پلی در `game/cloudreplay.js`)؛ main.js 1762 خط (0.268.0: C-CLN-88 — بازی/منو/ذخیره در `game/savemenu.js`)؛ main.js 1912 خط (0.267.0: C-CLN-87 — دکمه‌های سفارش در `game/ordersui.js`)؛ main.js 2148 خط (0.266.0: C-CLN-86 — سیم‌کشی پالت/کلیدها در `game/palettekeys.js`)؛ main.js 2369 خط (0.265.0: C-CLN-85 — تعامل اشاره‌گر در `game/pointerui.js`)؛ main.js 3001 خط (0.264.0: C-CLN-84 — بازپینت پنل‌ها در `game/panelui.js`)؛ main.js 3280 خط (0.263.0: C-CLN-83 — شروع تازه در `game/newgame.js`)؛ main.js 3335 خط (0.262.0: C-CLN-82 — سیم‌کشی منو در `game/menuui.js`)؛ main.js 3534 خط (0.261.0: C-CLN-79/80 — سوئیت‌های `services.js`/`idb.js` + C-CLN-81 — سیم‌کشی پروفایل در `game/profileui.js`)؛ main.js 3580 خط (0.260.0: C-CLN-76/77 — سوئیت‌های `stable.js`/`troops.js` + C-CLN-78 — ماژول منو `game/menuui.js`)؛ main.js 3610 خط (0.259.0: C-CLN-73/74 — سوئیت‌های `hire.js`/`guilds.js` + C-CLN-75 — ماژول قلاب‌های تیک `game/tickhooks.js`)؛ main.js 3622 خط (0.258.0: C-CLN-70/71 — سوئیت‌های `patrol.js`/`roads.js` + C-CLN-72 — ماژول تماشا `game/watchui.js`)؛ main.js 3706 خط (0.257.0: C-CLN-67/68 — سوئیت‌های `orders.js`/`attack.js` + C-CLN-69 — ماژول مأموریت `game/missionui.js`)؛ main.js 3881 خط (0.256.0: C-CLN-64/65 — سوئیت‌های `absence.js`/`fortify.js` + C-CLN-66 — ماژول ویرایشگر `game/editorui.js`)؛ main.js 4103 خط (0.255.0: C-CLN-61/62 — سوئیت‌های `gatecapture.js`/`siege.js` + C-CLN-63 — ماژول پنل‌ها `game/panelui.js`)؛ main.js 4244 خط (0.254.0: C-CLN-58/59 — سوئیت‌های `tower.js`/`gate.js` + C-CLN-60 — ماژول نمای چندنفره `game/mpview.js`)؛ main.js 4296 خط (0.253.0: C-CLN-55/56 — سوئیت‌های `aggro.js`/`fort.js` + C-CLN-57 — ماژول کاتب `game/scribeui.js`)؛ main.js 4359 خط (0.252.0: C-CLN-52/53 — سوئیت‌های `ballista.js`/`stance.js` + C-CLN-54 — ماژول نوار ری‌پلی `game/replaybar.js`)؛ main.js 4377 خط (0.251.0: C-CLN-49/50 — سوئیت‌های `truce.js`/`arab.js` + C-CLN-51 — ماژول نشست/فهرست لابی `game/lobbyui.js`)؛ جداسازی بعدی با ctx صریح + smoke زنده هر قدم).
- [x] حذف وندور `ws` (0.235.0: C-CLN-2 — `npm install` در دیپلوی).
- [x] تریاژ `scratch/` (0.235.0: C-CLN-3 — سازنده زنده ثبت شد + افزونه‌ها پاک شدند) + به‌روزرسانی `src/README.md`.
پذیرش: ردیف‌های `C-CLN-*` + سوئیت سبز بی‌تغییر + بیلد/بنچ سالم. (0.239.0: سه ردیف پنجم سبز + 689/689؛ مانده: جداسازی بیشتر main.js + شکستن بقیه سوئیت‌ها.)
