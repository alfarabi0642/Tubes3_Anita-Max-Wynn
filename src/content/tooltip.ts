import type { MatchResult, ScanSummary } from "../algorithms/types";
import { getAlgorithmExecutionTime, getKeywordCount } from "../shared/stats";

const TOOLTIP_ID = "judol-detector-tooltip";
const EXTENSION_ATTRIBUTE = "data-judol-extension";

function formatMs(value: number): string {
  return `${value.toFixed(2)} ms`;
}

function ensureTooltipElement(): HTMLElement {
  const existing = document.getElementById(TOOLTIP_ID);

  if (existing instanceof HTMLElement) {
    return existing;
  }

  const tooltip = document.createElement("div");
  tooltip.id = TOOLTIP_ID;
  tooltip.setAttribute(EXTENSION_ATTRIBUTE, "true");
  tooltip.className = "judol-detector-tooltip";
  document.documentElement.appendChild(tooltip);
  return tooltip;
}

function positionTooltip(tooltip: HTMLElement, event: MouseEvent): void {
  const padding = 12;
  const offset = 14;
  const maxLeft = window.innerWidth - tooltip.offsetWidth - padding;
  const maxTop = window.innerHeight - tooltip.offsetHeight - padding;
  const nextLeft = Math.max(padding, Math.min(event.clientX + offset, maxLeft));
  const nextTop = Math.max(padding, Math.min(event.clientY + offset, maxTop));

  tooltip.style.left = `${nextLeft}px`;
  tooltip.style.top = `${nextTop}px`;
}

function clearElement(element: HTMLElement): void {
  while (element.firstChild !== null) {
    element.removeChild(element.firstChild);
  }
}

function appendTooltipRow(tooltip: HTMLElement, labelText: string, valueText: string): void {
  const row = document.createElement("div");
  const label = document.createElement("span");
  const value = document.createElement("strong");

  label.textContent = labelText;
  value.textContent = valueText;
  row.appendChild(label);
  row.appendChild(value);
  tooltip.appendChild(row);
}

function setTooltipContent(tooltip: HTMLElement, match: MatchResult, summary: ScanSummary): void {
  const occurrenceCount = getKeywordCount(summary, match.keyword);
  const executionTime = getAlgorithmExecutionTime(summary, match.algorithm);

  clearElement(tooltip);
  appendTooltipRow(tooltip, "Keyword", match.keyword);
  appendTooltipRow(tooltip, "Algorithm", match.algorithm);
  appendTooltipRow(tooltip, "Occurrences", String(occurrenceCount));
  appendTooltipRow(tooltip, "Time", formatMs(executionTime));

  if (match.score !== undefined) {
    appendTooltipRow(tooltip, "Score", match.score.toFixed(2));
  }
}

export function attachTooltip(element: HTMLElement, match: MatchResult, summary: ScanSummary): void {
  element.addEventListener("mouseenter", (event) => {
    const tooltip = ensureTooltipElement();
    setTooltipContent(tooltip, match, summary);
    tooltip.classList.add("judol-detector-tooltip--visible");
    positionTooltip(tooltip, event);
  });

  element.addEventListener("mousemove", (event) => {
    const tooltip = ensureTooltipElement();
    positionTooltip(tooltip, event);
  });

  element.addEventListener("mouseleave", () => {
    removeTooltip();
  });
}

export function removeTooltip(): void {
  const tooltip = document.getElementById(TOOLTIP_ID);

  if (tooltip !== null) {
    tooltip.remove();
  }
}
