import { copyFile, cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { generateIcons } from "./generateIcons.mjs";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const distDir = resolve(projectRoot, "dist");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function copyAsset(source, target) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

async function ensureIcons() {
  const iconPath = resolve(projectRoot, "public/icons/icon-128.png");
  if (!(await exists(iconPath))) {
    await generateIcons();
  }
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await ensureIcons();

await build({
  configFile: false,
  root: projectRoot,
  publicDir: false,
  build: {
    target: "es2020",
    outDir: distDir,
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    lib: {
      entry: resolve(projectRoot, "src/content/contentScript.ts"),
      name: "JudolDetectorContent",
      formats: ["iife"],
      fileName: () => "content.js"
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});

await build({
  configFile: resolve(projectRoot, "vite.config.ts"),
  root: projectRoot
});

await copyAsset(resolve(projectRoot, "public/manifest.json"), resolve(distDir, "manifest.json"));
await copyAsset(resolve(projectRoot, "keywords/keywords.txt"), resolve(distDir, "keywords/keywords.txt"));
await copyAsset(resolve(projectRoot, "src/styles/content.css"), resolve(distDir, "content.css"));
await cp(resolve(projectRoot, "public/icons"), resolve(distDir, "icons"), { recursive: true });

console.log(`Built Chromium extension in ${distDir}`);
