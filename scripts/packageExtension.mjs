import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const distDir = resolve(projectRoot, "dist");
const outputDir = resolve(projectRoot, "release");
const outputPath = resolve(outputDir, "judol-detector-extension.zip");

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

function getDosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function createLocalHeader(fileName, fileData, modifiedAt) {
  const nameBuffer = Buffer.from(fileName, "utf8");
  const header = Buffer.alloc(30);
  const { dosTime, dosDate } = getDosDateTime(modifiedAt);
  const crc = crc32(fileData);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(dosTime, 10);
  header.writeUInt16LE(dosDate, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(fileData.length, 18);
  header.writeUInt32LE(fileData.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);

  return { buffer: Buffer.concat([header, nameBuffer, fileData]), crc, dosTime, dosDate };
}

function createCentralHeader(fileName, fileData, localOffset, metadata) {
  const nameBuffer = Buffer.from(fileName, "utf8");
  const header = Buffer.alloc(46);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(metadata.dosTime, 12);
  header.writeUInt16LE(metadata.dosDate, 14);
  header.writeUInt32LE(metadata.crc, 16);
  header.writeUInt32LE(fileData.length, 20);
  header.writeUInt32LE(fileData.length, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localOffset, 42);

  return Buffer.concat([header, nameBuffer]);
}

const files = await collectFiles(distDir);
const localParts = [];
const centralParts = [];
let offset = 0;

for (let i = 0; i < files.length; i += 1) {
  const filePath = files[i];
  const fileData = await readFile(filePath);
  const fileStat = await stat(filePath);
  const fileName = relative(distDir, filePath).replace(/\\/g, "/");
  const local = createLocalHeader(fileName, fileData, fileStat.mtime);

  localParts.push(local.buffer);
  centralParts.push(createCentralHeader(fileName, fileData, offset, local));
  offset += local.buffer.length;
}

const centralDirectory = Buffer.concat(centralParts);
const end = Buffer.alloc(22);

end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDirectory.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, Buffer.concat([...localParts, centralDirectory, end]));

console.log(`Packaged ${files.length} files into ${outputPath}`);
