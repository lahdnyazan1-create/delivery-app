// scripts/generate-icons.mjs
// ============================================================================
// توليد أيقونات التطبيق (PNG) برمجياً بلا اعتمادات خارجية — تدرج برتقالي
// بزوايا دائرية بهوية Zest (#FF6B35 → #FF8F66) مع "حرف Z" مرسوم بكسلياً.
// للتغيير لشعار مخصص: استبدل ملفات public/icons/*.png بنفس الأسماء فقط.
// تشغيل: node scripts/generate-icons.mjs
// ============================================================================

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "public", "icons");

// شكل حرف Z مبسط 11×11 (1 = أبيض)
const Z = [
  "11111111111",
  "11111111111",
  "00000000111",
  "00000001110",
  "00000011100",
  "00000111000",
  "00001110000",
  "00011100000",
  "00111000000",
  "11111111111",
  "11111111111",
];

const TOP = [0xff, 0x6b, 0x35]; // #FF6B35
const BOTTOM = [0xff, 0x8f, 0x66]; // #FF8F66

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

/** يبني PNG بحجم size: خلفية تدرج بزوايا دائرية + حرف Z أبيض في المنتصف */
function renderIcon(size, cornerRatio = 0.22, zScale = 0.55) {
  const radius = Math.round(size * cornerRatio);
  const pixels = Buffer.alloc(size * size * 4);

  // أبعاد شبكة الـ Z
  const gridW = Z[0].length;
  const gridH = Z.length;
  const cell = Math.floor((size * zScale) / Math.max(gridW, gridH));
  const zx = Math.floor((size - cell * gridW) / 2);
  const zy = Math.floor((size - cell * gridH) / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // زوايا دائرية → شفاف خارجها
      const dx = Math.max(radius - x, x - (size - 1 - radius), 0);
      const dy = Math.max(radius - y, y - (size - 1 - radius), 0);
      const inside = dx * dx + dy * dy <= radius * radius;

      if (!inside) continue; // alpha = 0

      // تدرج قطري
      const t = Math.min(1, (x + y) / (2 * size - 2));
      pixels[idx] = Math.round(TOP[0] + (BOTTOM[0] - TOP[0]) * t);
      pixels[idx + 1] = Math.round(TOP[1] + (BOTTOM[1] - TOP[1]) * t);
      pixels[idx + 2] = Math.round(TOP[2] + (BOTTOM[2] - TOP[2]) * t);
      pixels[idx + 3] = 255;

      // حرف Z أبيض
      const gx = Math.floor((x - zx) / cell);
      const gy = Math.floor((y - zy) / cell);
      if (
        x >= zx && y >= zy &&
        gx >= 0 && gx < gridW && gy >= 0 && gy < gridH &&
        Z[gy][gx] === "1"
      ) {
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
      }
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

// أيقونة عادية + maskable (هوامش أوسع 10% للأمان داخل دائرة الأندرويد)
const targets = [
  ["icon-192.png", 192, 0.22, 0.55],
  ["icon-512.png", 512, 0.22, 0.55],
  ["icon-512-maskable.png", 512, 0.05, 0.45],
  ["apple-touch-icon.png", 180, 0.22, 0.55],
];

for (const [name, size, corner, z] of targets) {
  writeFileSync(join(OUT_DIR, name), renderIcon(size, corner, z));
  console.log(`✓ ${name} (${size}×${size})`);
}
console.log("تم — الأيقونات في public/icons/");
