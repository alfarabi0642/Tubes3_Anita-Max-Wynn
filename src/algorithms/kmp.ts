import type { MatchResult, MatcherRunResult } from "./types";
import { normalizeCase } from "../shared/normalize";

export function buildKmpFailureTable(pattern: string): number[] {
  const normalizedPattern = normalizeCase(pattern);
  const failureTable = new Array<number>(normalizedPattern.length).fill(0);
  let borderLength = 0;
  let cursor = 1;

  while (cursor < normalizedPattern.length) {
    if (normalizedPattern[cursor] === normalizedPattern[borderLength]) {
      borderLength += 1;
      failureTable[cursor] = borderLength;
      cursor += 1;
      continue;
    }

    if (borderLength > 0) {
      borderLength = failureTable[borderLength - 1];
      continue;
    }

    failureTable[cursor] = 0;
    cursor += 1;
  }

  return failureTable;
}

export function searchKmp(text: string, keyword: string): MatcherRunResult {
  const normalizedText = normalizeCase(text);
  const normalizedKeyword = normalizeCase(keyword);
  const matches: MatchResult[] = [];
  let comparisons = 0;

  if (normalizedKeyword.length === 0 || normalizedText.length < normalizedKeyword.length) {
    return { matches, comparisons };
  }

  const failureTable = buildKmpFailureTable(normalizedKeyword);
  let textCursor = 0;
  let patternCursor = 0;

  while (textCursor < normalizedText.length) {
    comparisons += 1;

    if (normalizedText[textCursor] === normalizedKeyword[patternCursor]) {
      textCursor += 1;
      patternCursor += 1;

      if (patternCursor === normalizedKeyword.length) {
        const start = textCursor - normalizedKeyword.length;
        const end = textCursor;

        matches.push({
          keyword: normalizedKeyword,
          matchedText: text.slice(start, end),
          algorithm: "KMP",
          start,
          end,
          comparisons
        });

        patternCursor = failureTable[patternCursor - 1];
      }

      continue;
    }

    if (patternCursor > 0) {
      patternCursor = failureTable[patternCursor - 1];
      continue;
    }

    textCursor += 1;
  }

  return { matches, comparisons };
}
