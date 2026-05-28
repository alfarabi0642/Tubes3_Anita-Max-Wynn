import type { MatchResult, ScanSummary } from "../algorithms/types";
import { attachTooltip, removeTooltip } from "./tooltip";

const HIGHLIGHT_SELECTOR = "[data-judol-highlight=\"true\"]";
const EXTENSION_ATTRIBUTE = "data-judol-extension";

function sortMatchesForHighlight(matches: MatchResult[]): MatchResult[] {
  const sorted = matches.slice();

  sorted.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    return right.end - left.end;
  });

  return sorted;
}

function selectNonOverlappingMatches(matches: MatchResult[]): MatchResult[] {
  const sorted = sortMatchesForHighlight(matches);
  const selected: MatchResult[] = [];
  let lastEnd = 0;

  for (let i = 0; i < sorted.length; i += 1) {
    const match = sorted[i];

    if (match.start < lastEnd || match.start >= match.end) {
      continue;
    }

    selected.push(match);
    lastEnd = match.end;
  }

  return selected;
}

function createHighlightSpan(match: MatchResult, summary: ScanSummary): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = `judol-detector-highlight judol-detector-highlight--${match.algorithm
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;
  span.setAttribute("data-judol-highlight", "true");
  span.setAttribute(EXTENSION_ATTRIBUTE, "true");
  span.dataset.keyword = match.keyword;
  span.dataset.algorithm = match.algorithm;
  span.textContent = match.matchedText;
  attachTooltip(span, match, summary);
  return span;
}

export function applyHighlights(node: Text, matches: MatchResult[], summary: ScanSummary): void {
  const parent = node.parentNode;

  if (parent === null || matches.length === 0) {
    return;
  }

  const selectedMatches = selectNonOverlappingMatches(matches);

  if (selectedMatches.length === 0) {
    return;
  }

  const originalText = node.nodeValue ?? "";
  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (let i = 0; i < selectedMatches.length; i += 1) {
    const match = selectedMatches[i];

    if (match.start > cursor) {
      fragment.appendChild(document.createTextNode(originalText.slice(cursor, match.start)));
    }

    fragment.appendChild(createHighlightSpan(match, summary));
    cursor = match.end;
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
