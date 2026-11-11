# خط تولید هنر با مدل تصویرساز (پایلوت، 1.0.0-rc.4)

مدل: Cloudflare Workers AI، `@cf/black-forest-labs/flux-1-schnell` (از طریق `cf-ai.mjs`؛ اعتبار را پروکسی تزریق می‌کند و هیچ کلیدی در مخزن نیست).
سبک ثابت و دنیای بازی در `assets/world.md` و `assets/art-direction.md` است؛ پرامپت‌ها نباید نام بازی/اثر دیگری ببرند (نگهبان `t_legal_original`).

## ساختمان‌ها (`post.mjs` → `assets/buildings/<نوع>.png`، فهرست در `game/buildingart.js`)
1. تولید: `<توصیف>, isometric 2:1 game asset, single building centered, hand-painted stylized look, warm adobe mud-brick and turquoise glazed tile, Persian desert architecture, soft shading, crisp clean silhouette, viewed from above-front at 30 degrees, on a solid flat pure magenta #FF00FF background, no ground, no shadow, no text`
2. `node tools/ai-art/post.mjs raws.json` با `[{"name":"hut","src":"raw.jpg","w":2,"h":2}]`: حذف پس‌زمینه‌ی ماژنتا (و سایه‌ی مدل)، بزرگ‌ترین تکه، برش، مقیاس به عرض لوزی ردپا × ۳.
3. رندر (`drawArt` در `game/render.js`): مرکز تصویر روی مرکز ردپا، پایین تصویر روی رأس پایینی لوزی. تصویر نبود = رسم وکتوری. داربست ساخت، نوار جان، شعله، نوار رنگ تیم و خاکستری‌شدن بی‌کارگر همان قبلی‌اند.
- پایلوت: `keep` (۴×۴)، `hut` و `bakery` (۲×۲). توصیف‌ها: ارگ خشتی با گنبد فیروزه‌ای و برج‌های کنگره‌دار؛ خانه‌ی تخت‌بام خشتی؛ نانوایی با تنور و بادگیر.

## پرتره‌ها (`portrait.mjs` → `assets/portraits/<نام>.jpg`، ۲۵۶×۲۵۶)
`<توصیف>, painted fantasy character portrait, head and shoulders, three-quarter view, rich oil-painting look, ornate Persian-inspired armor with turquoise and gold details, dramatic warm rim light, dark muted teal background, highly detailed face, no text, no frame`
- پایلوت: `artan` (مرزبان میانسال ریش‌خاکستری، کلاه‌خود مخروطی با فیروزه) و `tirazheh` (فرمانده‌ی کمان‌دار جوان با شنل کلاه‌دار). برش آرتان امضای ناخواسته‌ی پایین‌چپ را حذف می‌کند — هر خروجی را باید نگاه کرد.

## آنچه آزموده شد و کافی نبود
- **یگان ایستا** (سرباز شمشیرزن روی ماژنتا): کیفیت خوب ولی ۱۰۰×۲۰۰ پیکسل در قاب بزرگ، زاویه‌ی ثابت نیست؛ به‌درد کارت یگان می‌خورد نه شیت ۵ جهت × ۴ فریم.
- **بافت زمین** (ماسه‌ی بی‌درز): ترک‌های گِلی تکراری با درز دیدنی در کاشی‌کاری ۳×۳؛ بدون پردازش اضافه قابل‌استفاده نیست.

## محدودیت‌ها
- seed ثبت نشده؛ تکرار دقیق تصویر ممکن نیست، پس **خروجی نهایی (PNG/JPG) منبع حقیقت است** و پرامپت فقط راهنما.
- `flux-2-klein-9b` جزئیات بیشتر داد ولی گاهی خطای سرور می‌داد؛ برای پایلوت فقط schnell.
- مجوز مدل را پیش از انتشار تجاری باید از کارت مدل تأیید کرد (در README اصلی ثبت شده).
