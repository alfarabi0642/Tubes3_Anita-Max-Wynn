import type { ScanSummary } from "../algorithms/types";

export const MESSAGE_TYPES = {
  getSummary: "JUDOL_GET_SUMMARY",
  rescan: "JUDOL_RESCAN",
  scanUpdated: "JUDOL_SCAN_UPDATED"
} as const;

export interface ScanRecord {
  url: string;
  title: string;
  summary: ScanSummary;
  updatedAt: number;
}

export interface GetSummaryMessage {
  type: typeof MESSAGE_TYPES.getSummary;
}

export interface RescanMessage {
  type: typeof MESSAGE_TYPES.rescan;
}

export interface ScanUpdatedMessage {
  type: typeof MESSAGE_TYPES.scanUpdated;
  record: ScanRecord;
}

export type JudolMessage = GetSummaryMessage | RescanMessage | ScanUpdatedMessage;

export interface JudolMessageResponse {
  ok: boolean;
  record?: ScanRecord;
  error?: string;
}
