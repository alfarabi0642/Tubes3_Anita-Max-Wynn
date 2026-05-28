import { describe, expect, it } from "vitest";
import { scanText } from "../../src/algorithms/matcherEngine";

describe("scanText", () => {
  it("finds exact keyword matches with algorithm stats", () => {
    const result = scanText("Konten ini memuat slot gacor dan jackpot.", {
      keywords: ["slot gacor", "jackpot"]
    });

    expect(result.totalMatches).toBeGreaterThan(0);
    expect(result.keywordCounts["SLOT GACOR"]).toBe(1);
    expect(result.keywordCounts.JACKPOT).toBe(1);
    expect(result.algorithmStats.length).toBeGreaterThan(0);
  });

  it("finds regex keyword-number patterns", () => {
    const result = scanText("Promo SLOT99 dan MAXWIN234 muncul, tetapi AMAN7 tidak.", {
      keywords: ["keyword yang tidak ada"]
    });

    expect(result.keywordCounts.SLOT99).toBe(1);
    expect(result.keywordCounts.MAXWIN234).toBe(1);
    expect(result.keywordCounts.AMAN7).toBeUndefined();
  });

  it("finds fuzzy visual substitutions when exact match is absent", () => {
    const result = scanText("Teks menyamarkan sl0t88 dan g4cor.", {
      keywords: ["slot88", "gacor"]
    });

    expect(result.keywordCounts.SLOT88).toBe(1);
    expect(result.keywordCounts.GACOR).toBe(1);
  });
});
