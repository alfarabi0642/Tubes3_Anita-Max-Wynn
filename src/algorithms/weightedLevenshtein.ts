import type { MatchResult, MatcherRunResult } from "./types";
import {
  DEFAULT_FUZZY_THRESHOLD,
  DELETION_COST,
  INSERTION_COST,
  NORMAL_SUBSTITUTION_COST,
  VISUAL_SUBSTITUTION_COST
} from "../shared/config";
import {
  areCharactersVisuallyEquivalent,
  isAsciiAlphaNumeric,
  normalizeCase
} from "../shared/normalize";

export interface WeightedLevenshteinOptions {
  visualSubstitutionCost?: number;
  normalSubstitutionCost?: number;
  insertionCost?: number;
  deletionCost?: number;
}

export interface WeightedDistanceResult {
  distance: number;
  comparisons: number;
}

interface CandidateSegment {
  normalizedText: string;
  start: number;
  end: number;
}

interface TokenSpan {
  normalizedText: string;
  start: number;
  end: number;
}

function getSubstitutionCost(
  leftChar: string,
  rightChar: string,
  options: Required<WeightedLevenshteinOptions>
): number {
  if (leftChar === rightChar) {
    return 0;
  }

  if (areCharactersVisuallyEquivalent(leftChar, rightChar)) {
    return options.visualSubstitutionCost;
  }

  return options.normalSubstitutionCost;
}

function withDefaultOptions(options: WeightedLevenshteinOptions = {}): Required<WeightedLevenshteinOptions> {
  return {
    visualSubstitutionCost: options.visualSubstitutionCost ?? VISUAL_SUBSTITUTION_COST,
    normalSubstitutionCost: options.normalSubstitutionCost ?? NORMAL_SUBSTITUTION_COST,
    insertionCost: options.insertionCost ?? INSERTION_COST,
    deletionCost: options.deletionCost ?? DELETION_COST
  };
}

export function weightedLevenshteinDistance(
  left: string,
  right: string,
  options: WeightedLevenshteinOptions = {}
): WeightedDistanceResult {
  const normalizedLeft = normalizeCase(left);
  const normalizedRight = normalizeCase(right);
  const resolvedOptions = withDefaultOptions(options);
  const matrix: number[][] = [];
  let comparisons = 0;

  for (let row = 0; row <= normalizedLeft.length; row += 1) {
    matrix[row] = [];
    matrix[row][0] = row * resolvedOptions.deletionCost;
  }

  for (let column = 0; column <= normalizedRight.length; column += 1) {
    matrix[0][column] = column * resolvedOptions.insertionCost;
  }

  for (let row = 1; row <= normalizedLeft.length; row += 1) {
    for (let column = 1; column <= normalizedRight.length; column += 1) {
      comparisons += 1;

      const substitutionCost = getSubstitutionCost(
        normalizedLeft[row - 1],
        normalizedRight[column - 1],
        resolvedOptions
      );
      const deletionScore = matrix[row - 1][column] + resolvedOptions.deletionCost;
      const insertionScore = matrix[row][column - 1] + resolvedOptions.insertionCost;
      const substitutionScore = matrix[row - 1][column - 1] + substitutionCost;

      matrix[row][column] = Math.min(deletionScore, insertionScore, substitutionScore);
    }
  }

  return {
    distance: matrix[normalizedLeft.length][normalizedRight.length],
    comparisons
  };
}

export function calculateWeightedSimilarity(
  left: string,
  right: string,
  options: WeightedLevenshteinOptions = {}
): number {
  const maxLength = Math.max(normalizeCase(left).length, normalizeCase(right).length);

  if (maxLength === 0) {
    return 1;
  }

  const result = weightedLevenshteinDistance(left, right, options);
  const score = 1 - result.distance / maxLength;

  return Math.max(0, score);
}

function isWhitespace(char: string): boolean {
  return char === " " || char === "\n" || char === "\r" || char === "\t" || char === "\f";
}

export function normalizeFuzzySegment(input: string): string {
  const normalizedInput = normalizeCase(input);
  let normalized = "";
  let pendingSpace = false;
  let hasContent = false;

  for (let i = 0; i < normalizedInput.length; i += 1) {
    const char = normalizedInput[i];

    if (isWhitespace(char)) {
      if (hasContent) {
        pendingSpace = true;
      }

      continue;
    }

    if (pendingSpace) {
      normalized += " ";
      pendingSpace = false;
    }

    normalized += char;
    hasContent = true;
  }

  return normalized;
}

function extractAlphanumericTokens(originalText: string): TokenSpan[] {
  const normalizedText = normalizeCase(originalText);
  const tokens: TokenSpan[] = [];
  let tokenStart = -1;

  for (let i = 0; i < normalizedText.length; i += 1) {
    if (isAsciiAlphaNumeric(normalizedText[i])) {
      if (tokenStart < 0) {
        tokenStart = i;
      }

      continue;
    }

    if (tokenStart >= 0) {
      tokens.push({
        normalizedText: normalizedText.slice(tokenStart, i),
        start: tokenStart,
        end: i
      });
      tokenStart = -1;
    }
  }

  if (tokenStart >= 0) {
    tokens.push({
      normalizedText: normalizedText.slice(tokenStart, normalizedText.length),
      start: tokenStart,
      end: normalizedText.length
    });
  }

  return tokens;
}

function countKeywordTokens(normalizedKeyword: string): number {
  let tokenCount = 0;
  let insideToken = false;

  for (let i = 0; i < normalizedKeyword.length; i += 1) {
    if (isAsciiAlphaNumeric(normalizedKeyword[i])) {
      if (!insideToken) {
        tokenCount += 1;
        insideToken = true;
      }

      continue;
    }

    insideToken = false;
  }

  return tokenCount;
}

function addCandidateSegment(
  candidates: CandidateSegment[],
  originalText: string,
  start: number,
  end: number
): void {
  candidates.push({
    normalizedText: normalizeFuzzySegment(originalText.slice(start, end)),
    start,
    end
  });
}

function extractCandidateSegments(originalText: string, normalizedKeyword: string): CandidateSegment[] {
  const tokens = extractAlphanumericTokens(originalText);
  const candidates: CandidateSegment[] = [];
  const keywordTokenCount = countKeywordTokens(normalizedKeyword);

  if (keywordTokenCount <= 1) {
    for (let i = 0; i < tokens.length; i += 1) {
      candidates.push(tokens[i]);
    }

    return candidates;
  }

  const minWindowSize = Math.max(1, keywordTokenCount - 1);
  const maxWindowSize = keywordTokenCount + 1;

  for (let startIndex = 0; startIndex < tokens.length; startIndex += 1) {
    for (let windowSize = minWindowSize; windowSize <= maxWindowSize; windowSize += 1) {
      const endIndex = startIndex + windowSize - 1;

      if (endIndex >= tokens.length) {
        continue;
      }

      addCandidateSegment(
        candidates,
        originalText,
        tokens[startIndex].start,
        tokens[endIndex].end
      );
    }
  }

  return candidates;
}

export function searchWeightedLevenshtein(
  text: string,
  keyword: string,
  threshold: number = DEFAULT_FUZZY_THRESHOLD,
  options: WeightedLevenshteinOptions = {}
): MatcherRunResult {
  const normalizedKeyword = normalizeFuzzySegment(keyword);
  const matches: MatchResult[] = [];
  let comparisons = 0;

  if (normalizedKeyword.length === 0) {
    return { matches, comparisons };
  }

  const candidates = extractCandidateSegments(text, normalizedKeyword);
  const allowedLengthDelta = Math.max(1, Math.floor(normalizedKeyword.length * 0.25));

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const lengthDelta = Math.abs(candidate.normalizedText.length - normalizedKeyword.length);

    if (lengthDelta > allowedLengthDelta) {
      continue;
    }

    const distanceResult = weightedLevenshteinDistance(candidate.normalizedText, normalizedKeyword, options);
    comparisons += distanceResult.comparisons;

    const maxLength = Math.max(candidate.normalizedText.length, normalizedKeyword.length);
    const score = maxLength === 0 ? 1 : Math.max(0, 1 - distanceResult.distance / maxLength);

    if (score >= threshold) {
      matches.push({
        keyword: normalizedKeyword,
        matchedText: text.slice(candidate.start, candidate.end),
        algorithm: "Weighted-Levenshtein",
        start: candidate.start,
        end: candidate.end,
        score,
        comparisons
      });
    }
  }

  return { matches, comparisons };
}
