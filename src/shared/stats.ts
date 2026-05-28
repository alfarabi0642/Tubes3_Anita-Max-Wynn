import type { AlgorithmName, AlgorithmStats, MatchResult, ScanSummary } from "../algorithms/types";

export function createEmptyScanSummary(scannedAt: number = Date.now()): ScanSummary {
  return {
    totalMatches: 0,
    keywordCounts: {},
    algorithmStats: [],
    scannedAt,
    matches: []
  };
}

function addKeywordCount(target: Record<string, number>, keyword: string, count: number): void {
  target[keyword] = (target[keyword] ?? 0) + count;
}

function findAlgorithmStat(stats: AlgorithmStats[], algorithm: AlgorithmName): AlgorithmStats | undefined {
  for (let i = 0; i < stats.length; i += 1) {
    if (stats[i].algorithm === algorithm) {
      return stats[i];
    }
  }

  return undefined;
}

function mergeAlgorithmStats(target: AlgorithmStats[], source: AlgorithmStats[]): void {
  for (let i = 0; i < source.length; i += 1) {
    const incoming = source[i];
    const existing = findAlgorithmStat(target, incoming.algorithm);

    if (existing === undefined) {
      target.push({
        algorithm: incoming.algorithm,
        matchCount: incoming.matchCount,
        executionTimeMs: incoming.executionTimeMs,
        comparisons: incoming.comparisons
      });
      continue;
    }

    existing.matchCount += incoming.matchCount;
    existing.executionTimeMs += incoming.executionTimeMs;
    existing.comparisons = (existing.comparisons ?? 0) + (incoming.comparisons ?? 0);
  }
}

export function combineScanSummaries(summaries: ScanSummary[]): ScanSummary {
  const combined = createEmptyScanSummary();

  for (let i = 0; i < summaries.length; i += 1) {
    const summary = summaries[i];
    combined.totalMatches += summary.totalMatches;
    mergeAlgorithmStats(combined.algorithmStats, summary.algorithmStats);

    const keywords = Object.keys(summary.keywordCounts);
    for (let keywordIndex = 0; keywordIndex < keywords.length; keywordIndex += 1) {
      const keyword = keywords[keywordIndex];
      addKeywordCount(combined.keywordCounts, keyword, summary.keywordCounts[keyword]);
    }

    for (let matchIndex = 0; matchIndex < summary.matches.length; matchIndex += 1) {
      combined.matches.push(summary.matches[matchIndex]);
    }
  }

  combined.algorithmStats.sort((left, right) => left.algorithm.localeCompare(right.algorithm));
  return combined;
}

export function getKeywordCount(summary: ScanSummary, keyword: string): number {
  return summary.keywordCounts[keyword] ?? 0;
}

export function getAlgorithmExecutionTime(summary: ScanSummary, algorithm: AlgorithmName): number {
  const stat = findAlgorithmStat(summary.algorithmStats, algorithm);
  return stat?.executionTimeMs ?? 0;
}

export function countMatchesByAlgorithm(matches: MatchResult[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (let i = 0; i < matches.length; i += 1) {
    const algorithm = matches[i].algorithm;
    counts[algorithm] = (counts[algorithm] ?? 0) + 1;
  }

  return counts;
}
