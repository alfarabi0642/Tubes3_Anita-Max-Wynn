import type { MatchResult, ScanSummary } from "../algorithms/types";
import { attachTooltip, removeTooltip } from "./tooltip";

const HIGHLIGHT_SELECTOR = "[data-judol-highlight=\"true\"]";
const EXTENSION_ATTRIBUTE = "data-judol-extension";

export interface HighlightGroup {
  start: number;
  end: number;
  matches: MatchResult[];
}

function compareMatchesForHighlight(left: MatchResult, right: MatchResult): number {
  if (left.start !== right.start) {
    return left.start - right.start;
  }

  if (left.end !== right.end) {
    return right.end - left.end;
  }

  if (left.keyword !== right.keyword) {
    return left.keyword.localeCompare(right.keyword);
  }

  return left.algorithm.localeCompare(right.algorithm);
}

function sortMatchesForHighlight(matches: MatchResult[]): MatchResult[] {
  const sorted = matches.slice();

  sorted.sort(compareMatchesForHighlight);

  return sorted;
}

function isValidMatch(match: MatchResult): boolean {
  return match.start >= 0 && match.start < match.end;
}

export function createHighlightGroups(matches: MatchResult[]): HighlightGroup[] {
  const sorted = sortMatchesForHighlight(matches);
  const groups: HighlightGroup[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const match = sorted[i];

    if (!isValidMatch(match)) {
      continue;
    }

    const currentGroup = groups[groups.length - 1];

    if (currentGroup !== undefined && match.start < currentGroup.end) {
      currentGroup.matches.push(match);

      if (match.end > currentGroup.end) {
        currentGroup.end = match.end;
      }

      currentGroup.matches.sort(compareMatchesForHighlight);
      continue;
    }

    groups.push({
      start: match.start,
      end: match.end,
      matches: [match]
    });
  }

  return groups;
}

function getPrimaryMatch(group: HighlightGroup): MatchResult {
  return group.matches[0];
}

function hasAlgorithm(matches: MatchResult[], algorithm: string, limit: number): boolean {
  for (let i = 0; i < limit; i += 1) {
    if (matches[i].algorithm === algorithm) {
      return true;
    }
  }

  return false;
}

function createAlgorithmLabel(matches: MatchResult[]): string {
  let label = "";

  for (let i = 0; i < matches.length; i += 1) {
    const algorithm = matches[i].algorithm;

    if (hasAlgorithm(matches, algorithm, i)) {
      continue;
    }

    label += label.length === 0 ? algorithm : `, ${algorithm}`;
  }

  return label;
}

function createHighlightSpan(group: HighlightGroup, originalText: string, summary: ScanSummary): HTMLSpanElement {
  const primaryMatch = getPrimaryMatch(group);
  const span = document.createElement("span");
  span.className = `judol-detector-highlight judol-detector-highlight--${primaryMatch.algorithm
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;
  span.setAttribute("data-judol-highlight", "true");
  span.setAttribute(EXTENSION_ATTRIBUTE, "true");
  span.dataset.keyword = primaryMatch.keyword;
  span.dataset.algorithm = createAlgorithmLabel(group.matches);
  span.textContent = originalText.slice(group.start, group.end);
  attachTooltip(span, group.matches, summary);
  return span;
}

export function applyHighlights(node: Text, matches: MatchResult[], summary: ScanSummary): void {
  const parent = node.parentNode;

  if (parent === null || matches.length === 0) {
    return;
  }

  const highlightGroups = createHighlightGroups(matches);

  if (highlightGroups.length === 0) {
    return;
  }

  const originalText = node.nodeValue ?? "";
  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (let i = 0; i < highlightGroups.length; i += 1) {
    const group = highlightGroups[i];

    if (group.start > cursor) {
      fragment.appendChild(document.createTextNode(originalText.slice(cursor, group.start)));
    }

    fragment.appendChild(createHighlightSpan(group, originalText, summary));
    cursor = group.end;
  }

  if (cursor < originalText.length) {
    fragment.appendChild(document.createTextNode(originalText.slice(cursor)));
  }

  parent.replaceChild(fragment, node);
}

export function cleanupHighlights(): void {
  removeTooltip();

  const highlights = Array.from(document.querySelectorAll(HIGHLIGHT_SELECTOR));

  for (let i = 0; i < highlights.length; i += 1) {
    const highlight = highlights[i];
    const parent = highlight.parentNode;

    if (parent === null) {
      continue;
    }

    parent.replaceChild(document.createTextNode(highlight.textContent ?? ""), highlight);
    parent.normalize();
  }
}
