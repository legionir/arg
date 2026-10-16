# اجرای «ارگ» روی سرور خودت

این پوشه بک‌اند مستقل بازی است: همان منطق سرور پرچنس، بدون هیچ تغییری در
رفتار. با این سرور، اتاق‌های چندنفره، تالار پیروزی، شمار حاضران و ذخیره ابری
روی ماشین خودت کار می‌کنند — نه روی پرچنس.

## منطق سرور از کجا آمد؟

- `game-logic.js` = **کپی عینی** اسکریپت `<script type="text/x-server-plugin">`
  داخل `index.html` (با ابزار کپی شده، دستی ویرایش نشده). هر وقت منطق سرور
  در `index.html` عوض شد، همین فایل را دوباره کپی کن تا دو سرور هم‌رفتار بمانند.
- `server.mjs` فقط محیطِ دورش را می‌سازد: همان سه چیزی که پرچنس به اسکریپت
  می‌داد (`state`، `pubsub`، `self`) + سوکت + سرو فایل استاتیک.
- کلاینت (`src/game/selfhost.js`) روی پرچنس هیچ کاری نمی‌کند (اولویت با
  `root.createServerSocket` است)؛ بیرون پرچنس خودش به همین سرور وصل می‌شود.

## نصب و اجرا (VPS لینوکسی، Node 18+)

```bash
unzip arg-server-bundle.zip -d arg && cd arg/server
npm install        # فقط یک وابستگی: ws
node server.mjs    # http://<IP>:8080/
```

متغیرهای محیطی:

| نام | پیش‌فرض | معنی |
|---|---|---|
| `PORT` | `8080` | پورت HTTP + سوکت (مسیر سوکت: `/sock`) |
| `GAME_ROOT` | پوشه والد `server/` | ریشه فایل‌های بازی (`index.html` + `src/`) |

## سرویس دائمی (systemd)

```ini
# /etc/systemd/system/arg-server.service
[Unit]
Description=Arg stronghold game server
After=network.target

[Service]
User=arg
WorkingDirectory=/opt/arg/server
Environment=PORT=8080
ExecStart=/usr/bin/node server.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now arg-server
```

## ریورس‌پروکسی با TLS (nginx — پیشنهادی)

مرورگر صفحه `https` را فقط به سوکت `wss` وصل می‌کند؛ پس برای دامنه، جلوی
node یک nginx با certbot بگذار (سوکت همان `/sock` روی همان پورت):

```nginx
server {
  listen 443 ssl;
  server_name example.com;
  # ... ssl_certificate ... (certbot)

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

نکته: صفحه `http` به سوکت `ws` وصل می‌شود و صفحه `https` به `wss` — کلاینت
خودش تشخیص می‌دهد؛ چیزی برای تنظیم نیست مگر اینکه سوکت جای دیگری باشد:

- `?server=wss://example.com/sock` در آدرس صفحه، یا
- `localStorage["scw.server"] = "wss://example.com/sock"` در کنسول مرورگر.

## داده و بکاپ

- همه‌چیز (تالار ۲۰ رکوردی، اتاق‌ها، ۱۶ ورودی ابری) در **یک فایل** است:
  `server/data/state.bin` (حدود ۱MB). هر ۱۰ ثانیه (اگر تغییری باشد) و هنگام
  خاموشی تمیز ذخیره می‌شود. همین یک فایل را بکاپ بگیر.
- ظرفیت‌ها مثل پرچنس‌اند: ۳۲ اتاق، ۱۶ ورودی ابری ۶۴KB، همان سقف‌های نرخ
  (۶ ذخیره ابری در ۱۰ ثانیه هر اتصال، ۳۰ ورودی بازی در ۱۰ ثانیه، ...).
- تالار/ابری **مشترک همه بازیکنان** است (مثل پرچنس)؛ عبارت ابری را فقط هش‌شده
  نگه می‌داریم — ولی هر کس عبارت را بداند آن ذخیره را می‌خواند (امنیت در حد
  «رمز اتاق»، نه حساب کاربری).

## امنیت

- این اسکریپت سرور عمداً **عمومی** است (مثل نسخه پرچنس): هیچ رمز/کلیدی در آن
  نیست. همه ورودی‌ها اعتبارسنجی می‌شوند و سقف نرخ دارند.
- جلوی `server/data/` را در وب بگیر (server.mjs خودش فقط ریشه بازی را سرو
  می‌کند و `data/` بیرونِ آن است — دستی جابه‌جایش نکن).
- برای اتاق‌های خصوصی از رمز اتاق استفاده کن (فقط هش نگه داشته می‌شود).

## عیب‌یابی

| علامت | علت محتمل |
|---|---|
| بازی باز می‌شود ولی «آفلاین» (کارت آنلاین مخفی، اتاق‌ها خالی) | سوکت در دسترس نیست: پورت/فایروال، یا صفحه `https` به سوکت `ws` (باید `wss` + nginx) |
| `404` روی `/src/...` | `GAME_ROOT` اشتباه است (باید پوشه‌ای باشد که `index.html` در آن است) |
| `npm install` خطا داد | Node قدیمی است (`node -v` باید ≥۱۸ باشد) |
| اتاق ساخته می‌شود ولی حریف وصل نمی‌شود | هر دو باید **همان** آدرس سرور را ببینند (یک دامنه/IP واحد) |
