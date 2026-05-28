import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const iconDir = resolve(projectRoot, "public/icons");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function createCrcTable() {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let value = i;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[i] = value >>> 0;
  }

  return table;
}

const crcTable = createCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let i = 0; i < buffer.length; i += 1) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function choosePixel(size, x, y) {
  const margin = Math.max(1, Math.floor(size * 0.09));
  const border = Math.max(1, Math.floor(size * 0.08));
  const inBounds = x >= margin && y >= margin && x < size - margin && y < size - margin;

  if (!inBounds) {
    return [0, 0, 0, 0];
  }

  const inBorder = x < margin + border || y < margin + border || x >= size - margin - border || y >= size - margin - border;
  const diagonal = (x - y + size) % Math.max(3, Math.floor(size * 0.24)) < Math.max(1, Math.floor(size * 0.08));
  const inner = x > size * 0.28 && x < size * 0.72 && y > size * 0.28 && y < size * 0.72;

  if (inBorder) {
    return [24, 32, 47, 255];
  }

  if (inner) {
    return [255, 183, 3, 255];
  }

  if (diagonal) {
    return [42, 157, 143, 255];
  }

  return [246, 248, 252, 255];
}

function createPng(size) {
  const rowLength = 1 + size * 4;
  const raw = Buffer.alloc(rowLength * size);

  for (let y = 0; y < size; y += 1) {
    raw[y * rowLength] = 0;

    for (let x = 0; x < size; x += 1) {
      const pixel = choosePixel(size, x, y);
      const offset = y * rowLength + 1 + x * 4;
      raw[offset] = pixel[0];
      raw[offset + 1] = pixel[1];
      raw[offset + 2] = pixel[2];
      raw[offset + 3] = pixel[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    pngSignature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", deflateSync(raw)),
    createChunk("IEND", Buffer.alloc(0))
  ]);
}

export async function generateIcons() {
  await mkdir(iconDir, { recursive: true });

  for (const size of [16, 48, 128]) {
    const iconPath = resolve(iconDir, `icon-${size}.png`);
    await mkdir(dirname(iconPath), { recursive: true });
    await writeFile(iconPath, createPng(size));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await generateIcons();
  console.log(`Generated PNG icons in ${iconDir}`);
}
