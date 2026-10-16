# ایده‌ها — Stronghold: Crusader Web

> مخزن فرصت‌های توسعه. تعریف فیلدها و اصول در `src/idea-bank-spec.md`.
> ثبت سریع با `src/idea-template.md`.
>
> وضعیت واقعی پروژه (به‌روزرسانی: اکتبر ۲۰۲۶): از ۸ ایده، ۱ `completed` (‏UI-001 در 0.7.0)،
> ۱ `implemented` (‏CORE-002)، و ۶ `in_progress` با چک‌لیست باقی‌مانده در هر فایل.
> قواعد انتقال وضعیت پایین همین صفحه + معیارهای پذیرش در `src/qa-plan.md`.

## فهرست

| شناسه | عنوان | دسته اصلی | اندازه | ارزش | وضعیت |
|---|---|---|---|---|---|
| [CONST-001](CONST-001-construction-validation.md) | اعتبارسنجی محل ساخت ساختمان | Core Logic / Rules | M | زیاد | in_progress (۵ تست برخورد سبز؛ هزینه ساخت و قانون خاص مانده) |
| [CORE-001](CORE-001-worker-pathfinding.md) | بررسی قابلیت اتکای مسیریابی کارگران | Performance / Scalability | L | زیاد | in_progress (برش ششم: A* + پل زمینی، ۲۹/۲۹ تست سبز) |
| [CORE-002](CORE-002-game-clock.md) | حلقه زمان و چرخه به‌روزرسانی شبیه‌سازی | Architecture / Structure | M | زیاد | implemented (pause و batching زنده تأیید شد؛ پین‌تست ترتیب مانده) |
| [ECON-001](ECON-001-production-chain.md) | زنجیره پایه تولید و انبار منابع | Core Logic / Rules | M | زیاد | in_progress (برش دوم: زیرمجموعه + ۵ تست سبز) |
| [ECON-002](ECON-002-popularity.md) | استخراج و پیاده‌سازی قوانین محبوبیت | Core Logic / Rules | M | متوسط | in_progress (برش سوم: زیرمجموعه + ۱۰ تست سبز) |
| [PERSIST-001](PERSIST-001-save-load.md) | ذخیره و بازیابی وضعیت در مرورگر | Data / Information | M | زیاد | in_progress (برش چهارم: v1 + ۱۵ تست سبز) |
| [MIL-001](MIL-001-combat-basics.md) | قوانین پایه نبرد تن‌به‌تن و برد | Core Logic / Rules | M | متوسط | in_progress (برش پنجم: واحدها + v2؛ برش ششم: ۲۹ تست سبز) |
| [UI-001](UI-001-placement-feedback.md) | بازخورد دلیل رد ساخت + پنل منابع | User Experience / Interface | S | زیاد | completed (منتشرشده در 0.7.0؛ هر ۴ معیار پاس) |

## ترتیب پیشنهادی بررسی (نه زمان‌بندی قطعی)

1. `CORE-002` (حلقه زمان) — زیرساخت همه شبیه‌سازی.
2. `CONST-001` + `UI-001` — ساخت و بازخوردش با هم معنا دارند.
3. `ECON-001` — تولید منابع روی حلقه زمان سوار می‌شود.
4. `CORE-001` — مسیریابی وقتی لازم می‌شود که واحدها مأموریت بگیرند.
5. `ECON-002` — محبوبیت به اقتصاد پایدار نیاز دارد.
6. `PERSIST-001` — وقتی مدل وضعیت تثبیت شد.
7. `MIL-001` — وقتی حرکت و وضعیت واحد قابل اتکا شد.

## افزودن ایده جدید

1. `src/idea-template.md` را کپی کن به `src/ideas/<TAG>-<NNN>-<slug>.md`.
2. یک سطر به جدول بالا اضافه کن.
3. فیلد «نامشخص» را خالی نگذار — صریح بنویس «نامشخص».

## قواعد انتقال وضعیت چرخه عمر (تعریف‌شده اکتبر ۲۰۲۶)

توالی رسمی (از `src/idea-bank-spec.md`):
`seed → analysis → approved → planned → in_progress → implemented → testing → verified → completed`

تأییدکننده: کاربر (تک‌نفره)؛ شاهد هر انتقال در همان فایل ایده ثبت می‌شود (تاریخ + خروجی تست/بازبینی).

| انتقال | شرط ورود (همه باید برقرار باشند) |
|---|---|
| seed → analysis | مسئله و «وضعیت فعلی» با شاهد (کد/تست/مشاهده) نوشته شده؛ مجهولات فهرست شده. |
| analysis → approved | راهکار از میان گزینه‌ها انتخاب و trade-off ثبت شده؛ وابستگی‌ها مشخص‌اند. |
| approved → planned | «اولین گام‌ها» (Suggested First Moves) به کارهای قابل اجرا شکسته شده. |
| planned → in_progress | اولین برش شروع شده (کد یا تحقیق). |
| in_progress → implemented | چک‌لیست «باقی‌مانده تا implemented» خالی است (انجام یا با دلیل معوق/ثبت‌شده)؛ «وضعیت فعلی» به‌روز است. |
| implemented → testing | معیارهای پذیرش ایده در `src/qa-plan.md` ثبت شده‌اند. |
| testing → verified | همه معیارهای `qa-plan` آن ایده `pass`‌اند (auto سبز + manual با شاهد)؛ هیچ `blocked` بازی وجود ندارد. |
| verified → completed | تغییر در نسخه منتشرشده/قابل ارائه قرار گرفته (فرایند: `src/release-process.md`؛ اولین برش: 0.7.0 شامل UI-001). |

نکته: `implemented ≠ verified` و `verified ≠ shipped` — کدِ موجود به‌تنهایی هیچ‌کدام را ثابت نمی‌کند.
