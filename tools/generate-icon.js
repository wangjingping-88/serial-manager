const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'assets');
const OUT_FILE = path.join(OUT_DIR, 'app.ico');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRectAlpha(x, y, w, h, r) {
  const cx = clamp(x, r, w - r);
  const cy = clamp(y, r, h - r);
  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= r ? 255 : 0;
}

function drawIcon(size) {
  const width = size;
  const height = size;
  const pixels = Buffer.alloc(width * height * 4);

  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const i = (y * width + x) * 4;
    pixels[i] = b;
    pixels[i + 1] = g;
    pixels[i + 2] = r;
    pixels[i + 3] = a;
  }

  function fillRect(x, y, w, h, color, radius = 0) {
    for (let yy = Math.floor(y); yy < Math.ceil(y + h); yy += 1) {
      for (let xx = Math.floor(x); xx < Math.ceil(x + w); xx += 1) {
        const alpha = radius ? roundRectAlpha(xx - x, yy - y, w, h, radius) : 255;
        if (alpha) {
          setPixel(xx, yy, color[0], color[1], color[2], alpha);
        }
      }
    }
  }

  function strokeLine(x1, y1, x2, y2, color, thickness) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
    for (let i = 0; i <= steps; i += 1) {
      const t = steps === 0 ? 0 : i / steps;
      const x = Math.round(x1 + (x2 - x1) * t);
      const y = Math.round(y1 + (y2 - y1) * t);
      fillRect(x - thickness / 2, y - thickness / 2, thickness, thickness, color, thickness / 2);
    }
  }

  const dark = [32, 33, 31];
  const paper = [247, 243, 232];
  const accent = [240, 180, 41];
  const teal = [19, 138, 138];

  fillRect(0, 0, width, height, [0, 0, 0], 0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      setPixel(x, y, 0, 0, 0, 0);
    }
  }

  fillRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88, dark, size * 0.18);
  fillRect(size * 0.25, size * 0.32, size * 0.5, size * 0.42, paper, size * 0.1);
  fillRect(size * 0.37, size * 0.16, size * 0.08, size * 0.18, accent, size * 0.03);
  fillRect(size * 0.55, size * 0.16, size * 0.08, size * 0.18, accent, size * 0.03);
  strokeLine(size * 0.34, size * 0.47, size * 0.66, size * 0.47, dark, Math.max(1, size * 0.055));
  strokeLine(size * 0.34, size * 0.6, size * 0.56, size * 0.6, dark, Math.max(1, size * 0.055));
  fillRect(size * 0.68, size * 0.68, size * 0.16, size * 0.16, teal, size * 0.08);

  return pixels;
}

function bitmapToIcoImage(size) {
  const width = size;
  const height = size;
  const pixels = drawIcon(size);
  const rowBytes = width * 4;
  const xorBytes = rowBytes * height;
  const maskStride = Math.ceil(width / 32) * 4;
  const maskBytes = maskStride * height;
  const header = Buffer.alloc(40);

  header.writeUInt32LE(40, 0);
  header.writeInt32LE(width, 4);
  header.writeInt32LE(height * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(xorBytes + maskBytes, 20);
  header.writeInt32LE(0, 24);
  header.writeInt32LE(0, 28);
  header.writeUInt32LE(0, 32);
  header.writeUInt32LE(0, 36);

  const xor = Buffer.alloc(xorBytes);
  for (let y = 0; y < height; y += 1) {
    const srcY = height - 1 - y;
    pixels.copy(xor, y * rowBytes, srcY * rowBytes, srcY * rowBytes + rowBytes);
  }

  return Buffer.concat([header, xor, Buffer.alloc(maskBytes)]);
}

function buildIco() {
  const images = SIZES.map((size) => ({ size, data: bitmapToIcoImage(size) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(images.length * 16);
  let offset = header.length + directory.length;
  images.forEach((image, index) => {
    const base = index * 16;
    directory[base] = image.size === 256 ? 0 : image.size;
    directory[base + 1] = image.size === 256 ? 0 : image.size;
    directory[base + 2] = 0;
    directory[base + 3] = 0;
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(image.data.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += image.data.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.data)]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, buildIco());
console.log(OUT_FILE);
