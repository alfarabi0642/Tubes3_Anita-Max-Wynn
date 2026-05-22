import type { ScanRecord } from "./messages";

const LAST_SCAN_KEY = "judol-detector:last-scan";

function ensureChromeStorage(): void {
  if (typeof chrome === "undefined" || chrome.storage?.local === undefined) {
    throw new Error("Chrome storage API is not available.");
  }
}

export async function saveScanRecord(record: ScanRecord): Promise<void> {
  ensureChromeStorage();

  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ [LAST_SCAN_KEY]: record }, () => {
      const error = chrome.runtime.lastError;

      if (error !== undefined) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}

export async function loadLastScanRecord(): Promise<ScanRecord | undefined> {
  ensureChromeStorage();

  return new Promise<ScanRecord | undefined>((resolve, reject) => {
    chrome.storage.local.get(LAST_SCAN_KEY, (items) => {
      const error = chrome.runtime.lastError;

      if (error !== undefined) {
        reject(new Error(error.message));
        return;
      }

      resolve(items[LAST_SCAN_KEY] as ScanRecord | undefined);
    });
  });
}
