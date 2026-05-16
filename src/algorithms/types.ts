export type AlgorithmName =
  | "KMP"
  | "Boyer-Moore"
  | "RegEx"
  | "Weighted-Levenshtein"
  | "Aho-Corasick"
  | "Rabin-Karp";

export interface MatchResult {
  keyword: string;
  matchedText: string;
  algorithm: AlgorithmName;
  start: number;
  end: number;
  score?: number;
  comparisons?: number;
}

export interface AlgorithmStats {
  algorithm: AlgorithmName;
  matchCount: number;
  executionTimeMs: number;
  comparisons?: number;
}

export interface ScanSummary {
  totalMatches: number;
  keywordCounts: Record<string, number>;
  algorithmStats: AlgorithmStats[];
  scannedAt: number;
  matches: MatchResult[];
}

export interface MatcherRunResult {
  matches: MatchResult[];
  comparisons: number;
}
