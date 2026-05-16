import type { MatchResult, MatcherRunResult } from "./types";
import { normalizeCase } from "../shared/normalize";

export function buildLastOccurrenceTable(pattern: string): Map<string, number> {
  const normalizedPattern = normalizeCase(pattern);
  const lastOccurrence = new Map<string, number>();

  for (let i = 0; i < normalizedPattern.length; i += 1) {
    lastOccurrence.set(normalizedPattern[i], i);
  }

  return lastOccurrence;
}

export function searchBoyerMoore(text: string, keyword: string): MatcherRunResult {
  const normalizedText = normalizeCase(text);
  const normalizedKeyword = normalizeCase(keyword);
  const matches: MatchResult[] = [];
  let comparisons = 0;

  if (normalizedKeyword.length === 0 || normalizedText.length < normalizedKeyword.length) {
    return { matches, comparisons };
  }

  const lastOccurrence = buildLastOccurrenceTable(normalizedKeyword);
  let shift = 0;

  while (shift <= normalizedText.length - normalizedKeyword.length) {
    let patternCursor = normalizedKeyword.length - 1;

    while (patternCursor >= 0) {
      comparisons += 1;

      if (normalizedKeyword[patternCursor] === normalizedText[shift + patternCursor]) {
        patternCursor -= 1;
        continue;
      }

      const mismatchedChar = normalizedText[shift + patternCursor];
      const lastSeenAt = lastOccurrence.get(mismatchedChar);
      const fallbackLastSeenAt = lastSeenAt === undefined ? -1 : lastSeenAt;
      const badCharacterShift = patternCursor - fallbackLastSeenAt;

      shift += Math.max(1, badCharacterShift);
      break;
    }

    if (patternCursor < 0) {
      const start = shift;
      const end = shift + normalizedKeyword.length;

      matches.push({
        keyword: normalizedKeyword,
        matchedText: text.slice(start, end),
        algorithm: "Boyer-Moore",
        start,
        end,
        comparisons
      });

      shift += 1;
    }
  }

  return { matches, comparisons };
}
