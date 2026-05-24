import type { ScanSummary } from "../algorithms/types";

export const MESSAGE_TYPES = {
  getSummary: "JUDOL_GET_SUMMARY",
  rescan: "JUDOL_RESCAN",
  scanUpdated: "JUDOL_SCAN_UPDATED",
  setBlurMode: "JUDOL_SET_BLUR_MODE",
  getBlurMode: "JUDOL_GET_BLUR_MODE"
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

export interface SetBlurModeMessage {
  type: typeof MESSAGE_TYPES.setBlurMode;
  enabled: boolean;
}

export interface GetBlurModeMessage {
  type: typeof MESSAGE_TYPES.getBlurMode;
}

export type JudolMessage =
  | GetSummaryMessage
  | RescanMessage
  | ScanUpdatedMessage
  | SetBlurModeMessage
  | GetBlurModeMessage;

export interface JudolMessageResponse {
  ok: boolean;
  record?: ScanRecord;
  error?: string;
}

export interface BlurModeResponse {
  ok: boolean;
  enabled?: boolean;
  error?: string;
}
