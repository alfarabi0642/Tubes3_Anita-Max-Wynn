export interface ChartItem {
  label: string;
  value: number;
}

function clearElement(element: HTMLElement): void {
  while (element.firstChild !== null) {
    element.removeChild(element.firstChild);
  }
}

function createEmptyMessage(message: string): HTMLParagraphElement {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function sortItemsByValue(items: ChartItem[]): ChartItem[] {
  const sorted = items.slice();

  sorted.sort((left, right) => {
    if (left.value !== right.value) {
      return right.value - left.value;
    }

    return left.label.localeCompare(right.label);
  });

  return sorted;
}

function getFrequencyTone(value: number, maxValue: number): string {
  const ratio = maxValue === 0 ? 0 : value / maxValue;

  if (ratio >= 0.67) {
    return "high";
  }

  if (ratio >= 0.34) {
    return "medium";
  }

  return "low";
}

export function renderBarChart(container: HTMLElement, items: ChartItem[]): void {
  clearElement(container);

  if (items.length === 0) {
    container.appendChild(createEmptyMessage("No detected keywords yet."));
    return;
  }

  const sortedItems = sortItemsByValue(items);
  const maxValue = sortedItems[0]?.value ?? 1;

  for (let i = 0; i < sortedItems.length; i += 1) {
    const item = sortedItems[i];
    const tone = getFrequencyTone(item.value, maxValue);
    const isTopItem = i === 0;
    const row = document.createElement("div");
    row.className = "bar-row";

    if (isTopItem) {
      row.classList.add("bar-row--top");
    }

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = item.label;

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = `bar-fill bar-fill--${tone}`;
    fill.style.width = `${Math.max(6, (item.value / maxValue) * 100)}%`;
    fill.setAttribute("aria-label", `${item.label}: ${item.value}`);

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = String(item.value);

    track.appendChild(fill);
    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    container.appendChild(row);
  }
}
