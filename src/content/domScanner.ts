import { scanText, type ScanTextOptions } from "../algorithms/matcherEngine";
import type { MatchResult, ScanSummary } from "../algorithms/types";
import { combineScanSummaries } from "../shared/stats";
import { collectVisibleTextNodes } from "./textNodeWalker";

export interface NodeScanResult {
  node: Text;
  text: string;
  matches: MatchResult[];
}

export interface PageScanResult {
  summary: ScanSummary;
  nodeResults: NodeScanResult[];
}

export function scanPageText(
  keywords: string[],
  options: Omit<ScanTextOptions, "keywords"> = {}
): PageScanResult {
  const visibleNodes = collectVisibleTextNodes();
  const summaries: ScanSummary[] = [];
  const nodeResults: NodeScanResult[] = [];

  for (let i = 0; i < visibleNodes.length; i += 1) {
    const visibleNode = visibleNodes[i];
    const summary = scanText(visibleNode.text, { ...options, keywords });

    if (summary.matches.length > 0) {
      nodeResults.push({
        node: visibleNode.node,
        text: visibleNode.text,
        matches: summary.matches
      });
    }

    summaries.push(summary);
  }

  return {
    summary: combineScanSummaries(summaries),
    nodeResults
  };
}