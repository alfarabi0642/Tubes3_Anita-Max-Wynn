import { describe, expect, it } from "vitest";
import type { AlgorithmName, MatchResult, ScanSummary } from "../../src/algorithms/types";
import { scanText } from "../../src/algorithms/matcherEngine";

const REQUIRED_ALGORITHMS: AlgorithmName[] = ["KMP", "Boyer-Moore", "RegEx", "Weighted-Levenshtein"];

function countMatchesByAlgorithm(summary: ScanSummary, algorithm: AlgorithmName): number {
  let count = 0;

  for (let i = 0; i < summary.matches.length; i += 1) {
    if (summary.matches[i].algorithm === algorithm) {
      count += 1;
    }
  }

  return count;
}

function hasMatch(
  matches: MatchResult[],
  keyword: string,
  algorithm: AlgorithmName,
  matchedText: string
): boolean {
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];

    if (match.keyword === keyword && match.algorithm === algorithm && match.matchedText === matchedText) {
      return true;
    }
  }

  return false;
}

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

  it("finds regex keyword-number patterns from QnA scope", () => {
    const result = scanText(
      "Promo SLOT99 MAXWIN234 IF2211 CS401 HTTP404 CONTOH1234 muncul, tetapi AMAN7 dan MAUSLOT tidak.",
      {
        keywords: ["keyword yang tidak ada"],
        activeAlgorithms: ["RegEx"]
      }
    );

    expect(result.keywordCounts.SLOT99).toBe(1);
    expect(result.keywordCounts.MAXWIN234).toBe(1);
    expect(result.keywordCounts.IF2211).toBe(1);
    expect(result.keywordCounts.CS401).toBe(1);
    expect(result.keywordCounts.HTTP404).toBe(1);
    expect(result.keywordCounts.CONTOH1234).toBe(1);
    expect(result.keywordCounts.AMAN7).toBeUndefined();
    expect(result.keywordCounts.MAUSLOT).toBeUndefined();
  });

  it("keeps exact and regex detections separate for gacor99", () => {
    const result = scanText("promo gacor99 hari ini", {
      keywords: ["gacor"],
      activeAlgorithms: ["KMP", "Boyer-Moore", "RegEx"]
    });

    expect(result.keywordCounts.GACOR).toBe(1);
    expect(result.keywordCounts.GACOR99).toBe(1);
    expect(result.totalMatches).toBe(2);
    expect(hasMatch(result.matches, "GACOR", "KMP", "gacor")).toBe(true);
    expect(hasMatch(result.matches, "GACOR", "Boyer-Moore", "gacor")).toBe(true);
    expect(hasMatch(result.matches, "GACOR99", "RegEx", "gacor99")).toBe(true);
  });

  it("keeps KMP and Boyer-Moore stats for the same exact occurrence", () => {
    const result = scanText("slot muncul sekali", {
      keywords: ["slot"],
      activeAlgorithms: ["KMP", "Boyer-Moore"]
    });

    expect(result.keywordCounts.SLOT).toBe(1);
    expect(countMatchesByAlgorithm(result, "KMP")).toBe(1);
    expect(countMatchesByAlgorithm(result, "Boyer-Moore")).toBe(1);
  });

  it("finds fuzzy visual substitutions when exact match is absent", () => {
    const result = scanText("Teks menyamarkan sl0t, g4cor, dan maxw1n.", {
      keywords: ["slot", "gacor", "maxwin"],
      activeAlgorithms: REQUIRED_ALGORITHMS
    });

    expect(result.keywordCounts.SLOT).toBe(1);
    expect(result.keywordCounts.GACOR).toBe(1);
    expect(result.keywordCounts.MAXWIN).toBe(1);
  });

  it("finds fuzzy multi-word visual substitutions", () => {
    const result = scanText("Promo sl0t gacor sedang ramai.", {
      keywords: ["slot gacor"],
      activeAlgorithms: REQUIRED_ALGORITHMS
    });

    expect(result.keywordCounts["SLOT GACOR"]).toBe(1);
  });

  it("does not flag safe fuzzy negative cases", () => {
    const result = scanText("Materi kuliah membahas struktur data dan algoritma.", {
      keywords: ["slot", "gacor", "maxwin"],
      activeAlgorithms: REQUIRED_ALGORITHMS
    });

    expect(result.totalMatches).toBe(0);
  });
});
