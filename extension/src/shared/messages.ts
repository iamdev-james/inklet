import type { ExtractedDocument } from "@/lib/types";

export type CaptureFailure = "not-article" | "restricted" | "error";

export interface CaptureOk {
  __offprint: "capture";
  ok: true;
  doc: ExtractedDocument;
  confidence: number;
}

export interface CaptureErr {
  __offprint: "capture";
  ok: false;
  reason: CaptureFailure;
  message?: string;
}

export type CaptureResponse = CaptureOk | CaptureErr;

export function isCaptureResponse(value: unknown): value is CaptureResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { __offprint?: unknown }).__offprint === "capture"
  );
}

export interface StashPrintMessage {
  __offprint: "stash-print";
  id: string;
  doc: ExtractedDocument;
}

export interface TakePrintMessage {
  __offprint: "take-print";
  id: string;
}
