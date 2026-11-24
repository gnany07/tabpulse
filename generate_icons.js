// TabPulse - Pure Node.js Zero-Dependency PNG Icon Generator (16, 32, 48, 128px)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateIconPng(size) {
  const rawRows = [];
  const center = size / 2;
  const radius = size * 0.45;

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter type 0

    for (let x = 0; x < size; x++) {
      const idx = 1 + x * 4;
      const nx = (x - center) / radius;
      const ny = (y - center) / radius;

      // Rounded squircle check
      const dist = Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2);
      if (dist > 1.0) {
        row[idx] = 0;
        row[idx + 1] = 0;
        row[idx + 2] = 0;
        row[idx + 3] = 0;
        continue;
      }

      // Indigo -> Purple gradient background
      const t = (x + y) / (2 * size);
      let r = Math.round(99 * (1 - t) + 168 * t);
      let g = Math.round(102 * (1 - t) + 85 * t);
      let b = Math.round(241 * (1 - t) + 247 * t);

      // Draw 3 clean tab-group cards / lightning emblem inside
      const rx = x / size;
      const ry = y / size;

      // Top colored pill bar (Cyan)
      if (ry >= 0.24 && ry <= 0.35 && rx >= 0.22 && rx <= 0.78) {
        r = 56; g = 189; b = 248;
      }
      // Middle colored pill bar (Emerald)
      else if (ry >= 0.44 && ry <= 0.55 && rx >= 0.22 && rx <= 0.68) {
        r = 52; g = 211; b = 153;
      }
      // Bottom colored pill bar (Amber)
      else if (ry >= 0.64 && ry <= 0.75 && rx >= 0.22 && rx <= 0.78) {
        r = 251; g = 191; b = 36;
      }

      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = 255;
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function generateFocusIconPng(size) {
  const rawRows = [];
  const center = size / 2;
  const radius = size * 0.45;

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;

    for (let x = 0; x < size; x++) {
      const idx = 1 + x * 4;
      const nx = (x - center) / radius;
      const ny = (y - center) / radius;

      const squircle = Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2);
      if (squircle > 1.0) {
        row[idx] = 0;
        row[idx + 1] = 0;
        row[idx + 2] = 0;
        row[idx + 3] = 0;
        continue;
      }

      // Vivid Purple -> Rose Focus Mode gradient background
      const t = (x + y) / (2 * size);
      let r = Math.round(147 * (1 - t) + 236 * t);
      let g = Math.round(51 * (1 - t) + 72 * t);
      let b = Math.round(234 * (1 - t) + 153 * t);

      // Draw crisp white concentric target rings + center bullseye dot
      const d = Math.sqrt(nx * nx + ny * ny);
      if ((d >= 0.52 && d <= 0.68) || (d <= 0.24)) {
        r = 255; g = 255; b = 255;
      }

      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = 255;
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

[16, 32, 48, 128].forEach((sz) => {
  const filePath = path.join(iconsDir, `icon${sz}.png`);
  fs.writeFileSync(filePath, generateIconPng(sz));
  console.log(`Generated ${filePath}`);

  const focusPath = path.join(iconsDir, `focus${sz}.png`);
  fs.writeFileSync(focusPath, generateFocusIconPng(sz));
  console.log(`Generated ${focusPath}`);
});
