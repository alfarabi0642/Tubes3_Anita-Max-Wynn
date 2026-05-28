import { describe, expect, it } from "vitest";
import type { MatchResult } from "../../src/algorithms/types";
import { createHighlightGroups } from "../../src/content/highlighter";

function createMatch(
  start: number,
  end: number,
  keyword: string,
  algorithm: MatchResult["algorithm"],
  matchedText: string
): MatchResult {
  return {
    keyword,
    matchedText,
    algorithm,
    start,
    end
  };
}

describe("createHighlightGroups", () => {
  it("groups overlapping exact, Boyer-Moore, and regex detections into one highlight range", () => {
    const groups = createHighlightGroups([
      createMatch(0, 5, "GACOR", "KMP", "gacor"),
      createMatch(0, 5, "GACOR", "Boyer-Moore", "gacor"),
      createMatch(0, 7, "GACOR99", "RegEx", "gacor99")
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].start).toBe(0);
    expect(groups[0].end).toBe(7);
    expect(groups[0].matches).toHaveLength(3);
  });

  it("keeps non-overlapping detections in separate highlight ranges", () => {
    const groups = createHighlightGroups([
      createMatch(0, 4, "SLOT", "KMP", "slot"),
      createMatch(10, 16, "MAXWIN", "RegEx", "maxwin")
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].start).toBe(0);
    expect(groups[1].start).toBe(10);
  });
});
