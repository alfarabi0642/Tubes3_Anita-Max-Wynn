import { loadKeywordsFromUrl } from "../shared/keywordLoader";
import { DEFAULT_KEYWORD_PATH } from "../shared/config";
import {
  MESSAGE_TYPES,
  type JudolMessage,
  type JudolMessageResponse,
  type ScanRecord
} from "../shared/messages";
import { saveScanRecord } from "../shared/storage";
import { scanPageText } from "./domScanner";
import { cleanupHighlights, applyHighlights } from "./highlighter";
import { createDebouncedRescan } from "./rescan";
import { isExtensionElement } from "./textNodeWalker";

const RESCAN_DEBOUNCE_MS = 450;

let cachedKeywords: string[] | undefined;
let currentRecord: ScanRecord | undefined;
let activeScanPromise: Promise<ScanRecord> | undefined;
let observer: MutationObserver | undefined;

async function loadKeywords(): Promise<string[]> {
  if (cachedKeywords !== undefined) {
    return cachedKeywords;
  }

  const keywordUrl = chrome.runtime.getURL(DEFAULT_KEYWORD_PATH);
  cachedKeywords = await loadKeywordsFromUrl(keywordUrl);
  return cachedKeywords;
}

function createRecord(summary: ScanRecord["summary"]): ScanRecord {
  return {
    url: window.location.href,
    title: document.title,
    summary,
    updatedAt: Date.now()
  };
}

function broadcastScanUpdated(record: ScanRecord): void {
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.scanUpdated, record }, () => {
    void chrome.runtime.lastError;
  });
}

function disconnectObserver(): void {
  observer?.disconnect();
}

function observePage(): void {
  const target = document.body ?? document.documentElement;

  if (target === null) {
    return;
  }

  if (observer === undefined) {
    observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i += 1) {
        const mutation = mutations[i];

        if (isExtensionElement(mutation.target)) {
          continue;
        }

        scheduleRescan();
        break;
      }
    });
  }

  observer.observe(target, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

async function performPageScan(): Promise<ScanRecord> {
  disconnectObserver();
  cleanupHighlights();

  try {
    const keywords = await loadKeywords();
    const pageScan = scanPageText(keywords);

    for (let i = 0; i < pageScan.nodeResults.length; i += 1) {
      const result = pageScan.nodeResults[i];
      applyHighlights(result.node, result.matches, pageScan.summary);
    }

    const record = createRecord(pageScan.summary);
    currentRecord = record;
    await saveScanRecord(record);
    broadcastScanUpdated(record);
    return record;
  } finally {
    observePage();
  }
}

function runPageScan(): Promise<ScanRecord> {
  if (activeScanPromise !== undefined) {
    return activeScanPromise;
  }

  activeScanPromise = performPageScan().finally(() => {
    activeScanPromise = undefined;
  });

  return activeScanPromise;
}

const scheduleRescan = createDebouncedRescan(() => {
  void runPageScan();
}, RESCAN_DEBOUNCE_MS);

function sendResponseSafely(sendResponse: (response: JudolMessageResponse) => void, response: JudolMessageResponse): void {
  try {
    sendResponse(response);
  } catch {
    // Popup may close before an async scan finishes.
  }
}

chrome.runtime.onMessage.addListener((message: JudolMessage, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.getSummary) {
    if (currentRecord !== undefined) {
      sendResponseSafely(sendResponse, { ok: true, record: currentRecord });
      return false;
    }

    runPageScan()
      .then((record) => sendResponseSafely(sendResponse, { ok: true, record }))
      .catch((error: unknown) =>
        sendResponseSafely(sendResponse, {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to scan page."
        })
      );
    return true;
  }

  if (message.type === MESSAGE_TYPES.rescan) {
    runPageScan()
      .then((record) => sendResponseSafely(sendResponse, { ok: true, record }))
      .catch((error: unknown) =>
        sendResponseSafely(sendResponse, {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to rescan page."
        })
      );
    return true;
  }

  return false;
});

function initialize(): void {
  observePage();
  void runPageScan();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}
