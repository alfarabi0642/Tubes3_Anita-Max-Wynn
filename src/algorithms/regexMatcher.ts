import type { MatchResult, MatcherRunResult } from "./types";
import { normalizeCase } from "../shared/normalize";

const KEYWORD_NUMBER_PATTERN = /(^|[^A-Za-z0-9])([A-Za-z]+[0-9]{2,})(?![A-Za-z0-9])/g;

export function searchRegexPatterns(text: string): MatcherRunResult {
  const matches: MatchResult[] = [];
  let regexResult: RegExpExecArray | null = KEYWORD_NUMBER_PATTERN.exec(text);

  while (regexResult !== null) {
    const prefix = regexResult[1] ?? "";
    const matchedText = regexResult[2] ?? "";
    const start = regexResult.index + prefix.length;
    const end = start + matchedText.length;
    const normalizedKeyword = normalizeCase(matchedText);

    matches.push({
      keyword: normalizedKeyword,
      matchedText,
      algorithm: "RegEx",
      start,
      end,
      comparisons: 0
    });

    if (KEYWORD_NUMBER_PATTERN.lastIndex <= regexResult.index) {
      KEYWORD_NUMBER_PATTERN.lastIndex = regexResult.index + 1;
    }

    regexResult = KEYWORD_NUMBER_PATTERN.exec(text);
  }

  KEYWORD_NUMBER_PATTERN.lastIndex = 0;

  return { matches, comparisons: 0 };
}
