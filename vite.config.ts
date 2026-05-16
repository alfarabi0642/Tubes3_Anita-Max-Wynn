/// <reference types="vitest" />

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/algorithms/matcherEngine.ts",
      name: "JudolDetectorCore",
      formats: ["es"],
      fileName: "matcherEngine"
    },
    outDir: "dist",
    emptyOutDir: true
  },
  test: {
    environment: "node",
    globals: true
  }
});
