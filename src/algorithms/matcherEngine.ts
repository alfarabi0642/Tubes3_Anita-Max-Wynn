import { searchBoyerMoore } from "./boyerMoore";
import { searchKmp } from "./kmp";
import { searchRegexPatterns } from "./regexMatcher";
import type { AlgorithmName, AlgorithmStats, MatchResult, MatcherRunResult, ScanSummary } from "./types";
import { searchWeightedLevenshtein } from "./weightedLevenshtein";
import { buildAhoCorasick, searchAhoCorasick } from "./ahoCorasick";
import { searchRabinKarpAll } from "./rabinKarp";
import { ACTIVE_ALGORITHMS, DEFAULT_FUZZY_THRESHOLD, DEFAULT_KEYWORDS } from "../shared/config";
import { normalizeKeywords, parseKeywordsFromText, loadKeywordsFromUrl } from "../shared/keywordLoader";
import { normalizeCase } from "../shared/normalize";

export interface ScanTextOptions {
  keywords?: string[];
  keywordText?: string;
  activeAlgorithms?: AlgorithmName[];
  fuzzyThreshold?: number;
}

function getNowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function isAlgorithmEnabled(activeAlgorithms: AlgorithmName[], algorithm: AlgorithmName): boolean {
  for (let i = 0; i < activeAlgorithms.length; i += 1) {
    if (activeAlgorithms[i] === algorithm) {
      return true;
    }
  }

  return false;
}

function resolveKeywords(options: ScanTextOptions): string[] {
  if (options.keywords !== undefined) {
    return normalizeKeywords(options.keywords);
  }

  if (options.keywordText !== undefined) {
    return parseKeywordsFromText(options.keywordText);
  }

  return normalizeKeywords(DEFAULT_KEYWORDS);
}

function createStats(
  algorithm: AlgorithmName,
  matchCount: number,
  executionTimeMs: number,
  comparisons: number
): AlgorithmStats {
  return {
    algorithm,
    matchCount,
    executionTimeMs,
    comparisons
  };
}

function runKeywordMatcher(
  text: string,
  keywords: string[],
  algorithm: "KMP" | "Boyer-Moore"
): {
  runResult: MatcherRunResult;
  exactKeywords: Set<string>;
} {
  const matches: MatchResult[] = [];
  const exactKeywords = new Set<string>();
  let comparisons = 0;

  for (let i = 0; i < keywords.length; i += 1) {
    const keyword = keywords[i];
    const result = algorithm === "KMP" ? searchKmp(text, keyword) : searchBoyerMoore(text, keyword);
    comparisons += result.comparisons;

    if (result.matches.length > 0) {
      exactKeywords.add(normalizeCase(keyword));
    }

    for (let j = 0; j < result.matches.length; j += 1) {
      matches.push(result.matches[j]);
    }
  }

  return {
    runResult: { matches, comparisons },
    exactKeywords
  };
}

function addSetValues(target: Set<string>, source: Set<string>): void {
  for (const value of source) {
    target.add(value);
  }
}

function hasSameOccurrence(left: MatchResult, right: MatchResult): boolean {
  return left.keyword === right.keyword && left.start === right.start && left.end === right.end;
}

function hasSameDetection(left: MatchResult, right: MatchResult): boolean {
  return hasSameOccurrence(left, right) && left.algorithm === right.algorithm;
}

function countKeywordMatches(matches: MatchResult[]): Record<string, number> {
  const keywordCounts: Record<string, number> = {};

  for (let i = 0; i < matches.length; i += 1) {
    let counted = false;

    for (let j = 0; j < i; j += 1) {
      if (hasSameOccurrence(matches[i], matches[j])) {
        counted = true;
        break;
      }
    }

    if (counted) {
      continue;
    }

    const keyword = matches[i].keyword;
    keywordCounts[keyword] = (keywordCounts[keyword] ?? 0) + 1;
  }

  return keywordCounts;
}

function countTotalKeywordOccurrences(keywordCounts: Record<string, number>): number {
  const keywords = Object.keys(keywordCounts);
  let total = 0;

  for (let i = 0; i < keywords.length; i += 1) {
    total += keywordCounts[keywords[i]];
  }

  return total;
}

function deduplicateMatches(matches: MatchResult[]): MatchResult[] {
  const uniqueMatches: MatchResult[] = [];

  for (let i = 0; i < matches.length; i += 1) {
    const candidate = matches[i];
    let duplicateFound = false;

    for (let j = 0; j < uniqueMatches.length; j += 1) {
      if (hasSameDetection(candidate, uniqueMatches[j])) {
        duplicateFound = true;
        break;
      }
    }

    if (!duplicateFound) {
      uniqueMatches.push(candidate);
    }
  }

  uniqueMatches.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    if (left.end !== right.end) {
      return left.end - right.end;
    }

    if (left.keyword !== right.keyword) {
      return left.keyword.localeCompare(right.keyword);
    }

    return left.algorithm.localeCompare(right.algorithm);
  });

  return uniqueMatches;
}

export function scanText(text: string, options: ScanTextOptions = {}): ScanSummary {
  const keywords = resolveKeywords(options);
  const activeAlgorithms = options.activeAlgorithms ?? ACTIVE_ALGORITHMS;
  const fuzzyThreshold = options.fuzzyThreshold ?? DEFAULT_FUZZY_THRESHOLD;
  const rawMatches: MatchResult[] = [];
  const algorithmStats: AlgorithmStats[] = [];
  const exactKeywords = new Set<string>();

  if (isAlgorithmEnabled(activeAlgorithms, "KMP")) {
    const startedAt = getNowMs();
    const { runResult, exactKeywords: kmpExactKeywords } = runKeywordMatcher(text, keywords, "KMP");
    const executionTimeMs = getNowMs() - startedAt;

    addSetValues(exactKeywords, kmpExactKeywords);
    algorithmStats.push(createStats("KMP", runResult.matches.length, executionTimeMs, runResult.comparisons));

    for (let i = 0; i < runResult.matches.length; i += 1) {
      rawMatches.push(runResult.matches[i]);
    }
  }

  if (isAlgorithmEnabled(activeAlgorithms, "Boyer-Moore")) {
    const startedAt = getNowMs();
    const { runResult, exactKeywords: bmExactKeywords } = runKeywordMatcher(text, keywords, "Boyer-Moore");
    const executionTimeMs = getNowMs() - startedAt;

    addSetValues(exactKeywords, bmExactKeywords);
    algorithmStats.push(
      createStats("Boyer-Moore", runResult.matches.length, executionTimeMs, runResult.comparisons)
    );

    for (let i = 0; i < runResult.matches.length; i += 1) {
      rawMatches.push(runResult.matches[i]);
    }
  }

  if (isAlgorithmEnabled(activeAlgorithms, "RegEx")) {
    const startedAt = getNowMs();
    const runResult = searchRegexPatterns(text);
    const executionTimeMs = getNowMs() - startedAt;

    algorithmStats.push(createStats("RegEx", runResult.matches.length, executionTimeMs, runResult.comparisons));

    for (let i = 0; i < runResult.matches.length; i += 1) {
      rawMatches.push(runResult.matches[i]);
    }
  }

  if (isAlgorithmEnabled(activeAlgorithms, "Weighted-Levenshtein")) {
    const startedAt = getNowMs();
    const fuzzyMatches: MatchResult[] = [];
    let comparisons = 0;

    for (let i = 0; i < keywords.length; i += 1) {
      const normalizedKeyword = normalizeCase(keywords[i]);

      if (exactKeywords.has(normalizedKeyword)) {
        continue;
      }

      const runResult = searchWeightedLevenshtein(text, normalizedKeyword, fuzzyThreshold);
      comparisons += runResult.comparisons;

      for (let j = 0; j < runResult.matches.length; j += 1) {
        fuzzyMatches.push(runResult.matches[j]);
      }
    }

    const executionTimeMs = getNowMs() - startedAt;
    algorithmStats.push(createStats("Weighted-Levenshtein", fuzzyMatches.length, executionTimeMs, comparisons));

    for (let i = 0; i < fuzzyMatches.length; i += 1) {
      rawMatches.push(fuzzyMatches[i]);
    }
  }

  if (isAlgorithmEnabled(activeAlgorithms, "Aho-Corasick")) {
    const startedAt = getNowMs();
    const automaton = buildAhoCorasick(keywords);
    const runResult = searchAhoCorasick(text, automaton);
    const executionTimeMs = getNowMs() - startedAt;

    algorithmStats.push(createStats("Aho-Corasick", runResult.matches.length, executionTimeMs, runResult.comparisons));

    for (let i = 0; i < runResult.matches.length; i += 1) {
      rawMatches.push(runResult.matches[i]);
    }
  }

  if (isAlgorithmEnabled(activeAlgorithms, "Rabin-Karp")) {
    const startedAt = getNowMs();
    const runResult = searchRabinKarpAll(text, keywords);
    const executionTimeMs = getNowMs() - startedAt;

    algorithmStats.push(createStats("Rabin-Karp", runResult.matches.length, executionTimeMs, runResult.comparisons));

    for (let i = 0; i < runResult.matches.length; i += 1) {
      rawMatches.push(runResult.matches[i]);
    }
  }

  const matches = deduplicateMatches(rawMatches);
  const keywordCounts = countKeywordMatches(matches);

  return {
    totalMatches: countTotalKeywordOccurrences(keywordCounts),
    keywordCounts,
    algorithmStats,
    scannedAt: Date.now(),
    matches
  };
}

export async function scanTextWithKeywordUrl(
  text: string,
  keywordUrl: string,
  options: Omit<ScanTextOptions, "keywords" | "keywordText"> = {}
): Promise<ScanSummary> {
  const keywords = await loadKeywordsFromUrl(keywordUrl);

  return scanText(text, {
    ...options,
    keywords
  });
}
