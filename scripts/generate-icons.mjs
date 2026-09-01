// scripts/generate-icons.mjs
// ============================================================================
// توليد أيقونات تطبيق دُغْري (PNG) برمجياً بلا اعتمادات خارجية — مربع بزوايا
// دائرية بتدرج برتقالي (#FF6B4E → #FF8F70) يعلوه سكوتر توصيل أبيض بصندوق
// طلبات، وفق دليل الهوية Brand/Brand.md (الكحلي #1A2B45 لتفاصيل العجلات).
// للتغيير لشعار مخصص: استبدل ملفات public/icons/*.png بنفس الأسماء فقط.
// تشغيل: node scripts/generate-icons.mjs
// ============================================================================

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "icons");

// 🎨 ألوان هوية دُغْري
const TOP = [0xff, 0x6b, 0x4e]; // #FF6B4E برتقالي دُغْري
const BOTTOM = [0xff, 0x8f, 0x70]; // درجة أفتح للتدرج
const NAVY = [0x1a, 0x2b, 0x45]; // #1A2B45 كحلي الاستقرار — تفاصيل

// ===== أدوات هندسية على شبكة تصميم 64×64 =====
const distToSeg = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

const inCircle = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) <= r;

const inRoundRect = (px, py, x1, y1, x2, y2, r) => {
  if (px < x1 || px > x2 || py < y1 || py > y2) return false;
  const qx = Math.max(x1 + r, Math.min(px, x2 - r));
  const qy = Math.max(y1 + r, Math.min(py, y2 - r));
  return Math.hypot(px - qx, py - qy) <= r;
};

/** لون نقطة من التصميم: "white" / "navy" / null (خلفية التدرج)
 *  سكوتر توصيل بعجلتين وصندوق طلبات — مقود أمامي وواجهة نظيفة */
function designColor(x, y) {
  // صلبا العجلتين الكحليان (قبل الأبيض كي لا يُحجبا)
  if (inCircle(x, y, 17.5, 43.5, 3.4)) return "navy";
  if (inCircle(x, y, 44, 43.5, 3.4)) return "navy";
  // العجلتان (إطار أبيض)
  if (inCircle(x, y, 17.5, 43.5, 9)) return "white";
  if (inCircle(x, y, 44, 43.5, 9)) return "white";
  // سطح الوقوف (المنصة)
  if (distToSeg(x, y, 23.5, 36.5, 39, 36.5) <= 2.7) return "white";
  // عمود التوجيه المائل
  if (distToSeg(x, y, 38, 35.5, 47, 16.5) <= 2.7) return "white";
  // المقود
  if (distToSeg(x, y, 37, 15.5, 55, 15.5) <= 2.5) return "white";
  // حزام الصندوق الكحلي (قبل أبيض الصندوق كي لا يُحجب)
  if (distToSeg(x, y, 17, 19.5, 17, 31.5) <= 1.7) return "navy";
  // صندوق التوصيل الخلفي
  if (inRoundRect(x, y, 9, 18.5, 25, 32.5, 3)) return "white";
  // حامل الصندوق
  if (distToSeg(x, y, 17, 32.5, 17, 37.5) <= 2.2) return "white";
  return null;
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** يبني PNG بحجم size: خلفية تدرج بزوايا دائرية + سكوتر دُغْري بمنتصفها.
 *  glyphScale > 1 يصغّر السكوتر (لهوامش أيقونة maskable الآمنة). */
function renderIcon(size, cornerRatio = 0.22, glyphScale = 1) {
  const radius = Math.round(size * cornerRatio);
  const pixels = Buffer.alloc(size * size * 4);

  // عيّنات فرعية 2×2 داخل كل بكسل لحواف ناعمة (anti-aliasing)
  const SUB = [0.25, 0.75];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // زوايا دائرية → شفاف خارجها
      const dx = Math.max(radius - x, x - (size - 1 - radius), 0);
      const dy = Math.max(radius - y, y - (size - 1 - radius), 0);
      if (dx * dx + dy * dy > radius * radius) continue; // alpha = 0

      // متوسط 4 عيّنات فرعية: لون التدرج ممزوجاً بلون التصميم إن وجد
      let r = 0;
      let g = 0;
      let b = 0;
      for (const sy of SUB) {
        for (const sx of SUB) {
          const fx = (x + sx) / size;
          const fy = (y + sy) / size;
          const t = Math.min(1, (fx + fy) / 2); // قطري علوي ← سفلي
          let cr = TOP[0] + (BOTTOM[0] - TOP[0]) * t;
          let cg = TOP[1] + (BOTTOM[1] - TOP[1]) * t;
          let cb = TOP[2] + (BOTTOM[2] - TOP[2]) * t;

          // إسقاط العينة على شبكة التصميم 64 حول المركز
          const gx = 32 + (fx * 64 - 32) / glyphScale;
          const gy = 32 + (fy * 64 - 32) / glyphScale;
          const c = designColor(gx, gy);
          if (c === "white") {
            cr = cg = cb = 255;
          } else if (c === "navy") {
            cr = NAVY[0];
            cg = NAVY[1];
            cb = NAVY[2];
          }
          r += cr / 4;
          g += cg / 4;
          b += cb / 4;
        }
      }

      pixels[idx] = Math.round(r);
      pixels[idx + 1] = Math.round(g);
      pixels[idx + 2] = Math.round(b);
      pixels[idx + 3] = 255;
    }
  }

  // ترميف الصفوف (filter 0) وتغليف PNG
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // عمق البت
  ihdr[9] = 6; // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });

// أيقونة عادية + maskable (هوامش أوسع 30% للأمان داخل دائرة الأندرويد)
const targets = [
  ["icon-192.png", 192, 0.22, 1],
  ["icon-512.png", 512, 0.22, 1],
  ["icon-512-maskable.png", 512, 0.05, 1.3],
  ["apple-touch-icon.png", 180, 0.22, 1],
];

for (const [name, size, corner, scale] of targets) {
  writeFileSync(join(OUT_DIR, name), renderIcon(size, corner, scale));
  console.log(`✓ ${name} (${size}×${size})`);
}

// أيقونات ميتاداتا Next (src/app) بنفس الهوية
const appTargets = [
  ["icon.png", 512, 0.22, 1],
  ["apple-icon.png", 180, 0.22, 1],
  ["favicon.png", 64, 0.22, 1],
];
for (const [name, size, corner, scale] of appTargets) {
  writeFileSync(join(ROOT, "src", "app", name), renderIcon(size, corner, scale));
  console.log(`✓ src/app/${name} (${size}×${size})`);
}

console.log("تم — أيقونات دُغْري في public/icons/ و src/app/");
