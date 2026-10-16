// درگ خط دیوار (0.47.0 — #۲۰ از FEATURES، الگوی CHG-046/IDEA-036 مرجع).
// ریاضیات خالص تایل + دروازه نوع، بدون import: برای تست هدلس امن است.
// قانون لایه‌بندی: sim هرگز «خط» نمی‌بیند — فراخوان صدها فرمان place تکیِ
// اعتبارسنجی‌شده می‌فرستد (هر تایل معنای تک‌کلیک + هزینه خودش را دارد)، پس
// هر تایل روی دیوار قبلی لنگر می‌گیرد و با تمام‌شدن چوب بقیه رد می‌خورند.
// دامنه: فقط قطعه دیوار ۱×۱؛ برج/دروازه تک‌کلیک می‌مانند.

// سقف طول یک درگ. TEMP: جلوگیری از اسپم صدها فرمان با یک سوایپ اشتباهی؛
// ۳۲ تایل هنوز نصف نقشه ۶۴تایی را در یک ژست می‌پوشاند.
export const WALL_LINE_MAX = 32;

// درگ فقط وقتی مال خط است که نوع مسلح دیوار باشد. خالص: موس، انتخاب باکسی
// و لمس هر سه از همین می‌پرسند تا ژست یکسان ابهام‌زدایی شود.
export function isLineDragType(type) {
  return type === "wall";
}

// خط supercover از (x0,y0) تا (x1,y1) شامل هر دو سر، به ترتیب درگ، بدون
// تکرار، با سقف max (پیش‌فرض WALL_LINE_MAX). برزنهام صحیح پس همیشه
// ۸-پیوسته است (قطرها شکاف ندارند) و برای سرهای یکسان قطعی است. خالص.
export function wallLineTiles(x0, y0, x1, y1, max) {
  const cap = max === undefined ? WALL_LINE_MAX : max;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  const out = [];
  const seen = new Set();
  let x = x0;
  let y = y0;
  if (dx >= dy) {
    let err = 2 * dy - dx;
    for (let i = 0; i <= dx; i += 1) {
      const k = x + "," + y;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ x, y });
        if (out.length >= cap) return out;
      }
      if (x === x1) break;
      if (err >= 0) {
        y += sy;
        err -= 2 * dx;
      }
      err += 2 * dy;
      x += sx;
    }
  } else {
    let err = 2 * dx - dy;
    for (let i = 0; i <= dy; i += 1) {
      const k = x + "," + y;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ x, y });
        if (out.length >= cap) return out;
      }
      if (y === y1) break;
      if (err >= 0) {
        x += sx;
        err -= 2 * dy;
      }
      err += 2 * dx;
      y += sy;
    }
  }
  return out;
}
