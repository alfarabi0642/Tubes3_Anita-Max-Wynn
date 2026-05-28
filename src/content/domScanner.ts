import { scanText } from "../algorithms/matcherEngine";
import type { MatchResult, ScanSummary } from "../algorithms/types";
import { combineScanSummaries } from "../shared/stats";
import { collectVisibleTextNodes, type VisibleTextNode } from "./textNodeWalker";

export interface NodeScanResult {
  node: Text;
  text: string;
  matches: MatchResult[];
}

export interface PageScanResult {
  summary: ScanSummary;
  nodeResults: NodeScanResult[];
}

function addNodeResult(results: NodeScanResult[], visibleNode: VisibleTextNode, summary: ScanSummary): void {
  if (summary.matches.length === 0) {
    return;
  }

  results.push({
    node: visibleNode.node,
    text: visibleNode.text,
    matches: summary.matches
  });
}

export function scanPageText(keywords: string[]): PageScanResult {
  const visibleNodes = collectVisibleTextNodes();
  const summaries: ScanSummary[] = [];
  const nodeResults: NodeScanResult[] = [];

  for (let i = 0; i < visibleNodes.length; i += 1) {
    const visibleNode = visibleNodes[i];
    const summary = scanText(visibleNode.text, { keywords });
    summaries.push(summary);
    addNodeResult(nodeResults, visibleNode, summary);
  }

  return {
    summary: combineScanSummaries(summaries),
    nodeResults
  };
}
