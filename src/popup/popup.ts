import type { AlgorithmStats } from "../algorithms/types";
import {
  MESSAGE_TYPES,
  type JudolMessage,
  type JudolMessageResponse,
  type BlurModeResponse,
  type ScanRecord
} from "../shared/messages";
import { loadLastScanRecord } from "../shared/storage";
import { renderBarChart, type ChartItem } from "./charts";

interface PopupElements {
  totalMatches: HTMLElement;
  lastScanned: HTMLElement;
  pageTitle: HTMLElement;
  statusText: HTMLElement;
  keywordChart: HTMLElement;
  algorithmList: HTMLElement;
  rescanButton: HTMLButtonElement;
  blurToggle: HTMLInputElement;
  blurLabel: HTMLElement;
}

function getElementById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing popup element: ${id}`);
  }

  return element as T;
}

const elements: PopupElements = {
  totalMatches:  getElementById("totalMatches"),
  lastScanned:   getElementById("lastScanned"),
  pageTitle:     getElementById("pageTitle"),
  statusText:    getElementById("statusText"),
  keywordChart:  getElementById("keywordChart"),
  algorithmList: getElementById("algorithmList"),
  rescanButton:  getElementById<HTMLButtonElement>("rescanButton"),
  blurToggle:    getElementById<HTMLInputElement>("blurToggle"),
  blurLabel:     getElementById("blurLabel")
};

function formatMs(value: number): string {
  return `${value.toFixed(2)} ms`;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}

function clearElement(element: HTMLElement): void {
  while (element.firstChild !== null) {
    element.removeChild(element.firstChild);
  }
}

function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

function sendTabMessage(
  tabId: number,
  message: JudolMessage
): Promise<JudolMessageResponse & BlurModeResponse> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: (JudolMessageResponse & BlurModeResponse) | undefined) => {
      const error = chrome.runtime.lastError;

      if (error !== undefined) {
        reject(new Error(error.message));
        return;
      }

      if (response === undefined) {
        reject(new Error("No response from content script."));
        return;
      }

      resolve(response);
    });
  });
}

function getKeywordItems(record: ScanRecord): ChartItem[] {
  const keywords = Object.keys(record.summary.keywordCounts);
  const items: ChartItem[] = [];

  for (let i = 0; i < keywords.length; i += 1) {
    const keyword = keywords[i];
    items.push({ label: keyword, value: record.summary.keywordCounts[keyword] });
  }

  return items;
}

function renderAlgorithmStats(stats: AlgorithmStats[]): void {
  clearElement(elements.algorithmList);

  if (stats.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No algorithm data yet.";
    elements.algorithmList.appendChild(empty);
    return;
  }

  for (let i = 0; i < stats.length; i += 1) {
    const stat = stats[i];
    const row = document.createElement("div");
    row.className = "algorithm-row";

    const name = document.createElement("strong");
    name.textContent = stat.algorithm;

    const count = document.createElement("span");
    count.textContent = `${stat.matchCount} matches`;

    const time = document.createElement("span");
    time.textContent = formatMs(stat.executionTimeMs);

    row.appendChild(name);
    row.appendChild(count);
    row.appendChild(time);
    elements.algorithmList.appendChild(row);
  }
}

function renderRecord(record: ScanRecord): void {
  elements.totalMatches.textContent = String(record.summary.totalMatches);
  elements.lastScanned.textContent  = formatTime(record.updatedAt);
  elements.pageTitle.textContent    = record.title.length === 0 ? record.url : record.title;
  elements.statusText.textContent   = "Scan summary is up to date.";
  renderBarChart(elements.keywordChart, getKeywordItems(record));
  renderAlgorithmStats(record.summary.algorithmStats);
}

function renderError(message: string): void {
  elements.statusText.textContent   = message;
  elements.totalMatches.textContent = "0";
  elements.lastScanned.textContent  = "-";
  elements.pageTitle.textContent    = "No active page summary.";
  renderBarChart(elements.keywordChart, []);
  renderAlgorithmStats([]);
}

async function loadSummaryFromActiveTab(): Promise<ScanRecord | undefined> {
  const activeTab = await getActiveTab();

  if (activeTab?.id === undefined) {
    return undefined;
  }

  const response = await sendTabMessage(activeTab.id, { type: MESSAGE_TYPES.getSummary });

  if (!response.ok) {
    throw new Error(response.error ?? "Content script failed to scan the page.");
  }

  return response.record;
}

async function loadSummary(): Promise<void> {
  elements.statusText.textContent = "Loading active tab summary.";

  try {
    const record = await loadSummaryFromActiveTab();

    if (record !== undefined) {
      renderRecord(record);
      return;
    }
  } catch {
    const storedRecord = await loadLastScanRecord();

    if (storedRecord !== undefined) {
      renderRecord(storedRecord);
      elements.statusText.textContent = "Showing the latest stored scan.";
      return;
    }
  }

  renderError("Open a regular web page, then run a scan.");
}

async function requestRescan(): Promise<void> {
  const activeTab = await getActiveTab();

  if (activeTab?.id === undefined) {
    renderError("No active tab is available.");
    return;
  }

  elements.rescanButton.disabled  = true;
  elements.statusText.textContent = "Rescanning page.";

  try {
    const response = await sendTabMessage(activeTab.id, { type: MESSAGE_TYPES.rescan });

    if (!response.ok || response.record === undefined) {
      throw new Error(response.error ?? "Rescan failed.");
    }

    renderRecord(response.record);
  } catch (error) {
    renderError(error instanceof Error ? error.message : "Rescan failed.");
  } finally {
    elements.rescanButton.disabled = false;
  }
}

function updateBlurLabel(enabled: boolean): void {
  elements.blurLabel.textContent = enabled ? "Blur ON" : "Blur OFF";
  elements.blurLabel.className   = enabled ? "blur-status blur-status--on" : "blur-status blur-status--off";
}

async function loadBlurState(): Promise<void> {
  try {
    const activeTab = await getActiveTab();

    if (activeTab?.id === undefined) {
      return;
    }

    const response = await sendTabMessage(activeTab.id, { type: MESSAGE_TYPES.getBlurMode });
    elements.blurToggle.checked = response.enabled ?? false;
    updateBlurLabel(response.enabled ?? false);
  } catch {
    updateBlurLabel(false);
  }
}

async function handleBlurToggle(): Promise<void> {
  const enabled   = elements.blurToggle.checked;
  const activeTab = await getActiveTab();

  updateBlurLabel(enabled);

  if (activeTab?.id === undefined) {
    return;
  }

  try {
    await sendTabMessage(activeTab.id, { type: MESSAGE_TYPES.setBlurMode, enabled });
  } catch {
  }
}

elements.rescanButton.addEventListener("click", () => { void requestRescan(); });
elements.blurToggle.addEventListener("change",  () => { void handleBlurToggle(); });

chrome.runtime.onMessage.addListener((message: JudolMessage) => {
  if (message.type === MESSAGE_TYPES.scanUpdated) {
    renderRecord(message.record);
  }
});

void loadSummary();
void loadBlurState();
