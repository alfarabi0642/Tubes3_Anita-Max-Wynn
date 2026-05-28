import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const source = resolve(projectRoot, "keywords/keywords.txt");
const target = resolve(projectRoot, "dist/keywords/keywords.txt");

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);

console.log(`Copied ${source} to ${target}`);
