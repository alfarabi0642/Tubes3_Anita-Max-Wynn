import { describe, expect, it } from "vitest";
import type { MatchResult, ScanSummary } from "../../src/algorithms/types";
import { formatTooltipDetection } from "../../src/content/tooltip";

const summary: ScanSummary = {
  totalMatches: 2,
  keywordCounts: {
    GACOR: 1,
    GACOR99: 1
  },
  algorithmStats: [
    { algorithm: "KMP", matchCount: 1, executionTimeMs: 1.25, comparisons: 10 },
    { algorithm: "RegEx", matchCount: 1, executionTimeMs: 0.5, comparisons: 0 }
  ],
  scannedAt: 1,
  matches: []
};

function createMatch(keyword: string, algorithm: MatchResult["algorithm"]): MatchResult {
  return {
    keyword,
    algorithm,
    matchedText: keyword.toLowerCase(),
    start: 0,
    end: keyword.length
  };
}

describe("formatTooltipDetection", () => {
  it("formats keyword, algorithm, occurrence count, and page-level execution time", () => {
    expect(formatTooltipDetection(createMatch("GACOR", "KMP"), summary)).toBe("GACOR | KMP | 1x | 1.25 ms");
    expect(formatTooltipDetection(createMatch("GACOR99", "RegEx"), summary)).toBe(
      "GACOR99 | RegEx | 1x | 0.50 ms"
    );
  });
});
