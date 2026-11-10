# E2E چهارنفره (0.234.0)

اسکریپت: `src/arg/tools/e2e-mp4.mjs` (Playwright، ۴ مرورگر واقعی روی سرور واقعی —
لابی → اقتصاد → تهاجم → مقایسه هش هر ۱۰۰ تیک → خروج سه بازیکن و پیروزی آخرین بازمانده).

## اجرا (dev/CI — بیرون این محیط)

```sh
node src/arg/tools/e2e-mp4.mjs --seconds 300 --out /tmp/arg-e2e-mp4 --port 8083
```

پیش‌نیاز: `node` + `playwright` + مرورگر کرومیوم (مسیر `/opt/pw-browsers/chromium` در
سرور dev؛ در CI با `PLAYWRIGHT_BROWSERS_PATH` خود playwright). کد خروج ۰ = قبول
(۰ ناهمگامی، ۰ خطای صفحه، پیروزی P1 پس از خروج دیگران)؛ ۱ = رد.

## وضعیت سلکتورها (تأیید 0.234.0)

همه سلکتورهای مورداستفاده اسکریپت در `index.html` موجودند:
`navMp`، `profileNameInput`، `mpMaxSel` (۲/۳/۴)، `mpCreateBtn`/`mpJoinBtn`،
`mpCodeInput`، `mpReadyBtn`، `mpStartBtn`، `__slice01` (state/mp/lobby) —
هدر اسکریپت از «(0.70.2)» به‌روز شد.

## اجرای دوره‌ای (پیشنهاد)

پس از هر نسخه فاز ۵/۶ (تغییر سرور/net) یک‌بار کامل (۳۰۰ثانیه) + پس از هر نسخه
معمولی حالت دود (`--seconds 60`). جایگزین headless هر نسخه: پین سوئیت
`t_tst_mp4` (اتاق ۴نفره واقعی از بلوک سرور همین صفحه + ۴ sim + rejoin میانی —
بدون مرورگر، زیر چند ثانیه) که واگرایی را همان‌جا می‌گیرد.
