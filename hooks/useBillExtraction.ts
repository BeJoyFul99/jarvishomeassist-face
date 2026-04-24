"use client";

import { useEffect, useState } from "react";
import { sseClient, type SSEMessage } from "@/lib/sseClient";

export type ExtractionPhase =
  | "idle"
  | "started"
  | "progress"
  | "completed"
  | "failed";

export interface ExtractionEvent {
  phase: ExtractionPhase;
  billId: number | null;
  status?: string;
  method?: string;
  confidence?: number;
  needsReview?: boolean;
  error?: string;
  note?: string;
}

/**
 * Subscribes to bill:extraction:* SSE events filtered by billId.
 * Returns the latest event. Pass null to pause subscription.
 */
export function useBillExtraction(billId: number | null): ExtractionEvent {
  const [event, setEvent] = useState<ExtractionEvent>({ phase: "idle", billId: null });

  useEffect(() => {
    if (billId === null) {
      setEvent({ phase: "idle", billId: null });
      return;
    }
    const unsub = sseClient.subscribe((msg: SSEMessage) => {
      if (!msg.type || !msg.type.startsWith("bill:")) return;
      const data = (msg.data ?? {}) as {
        bill_id?: number;
        status?: string;
        method?: string;
        confidence?: number;
        needs_review?: boolean;
        error?: string;
        note?: string;
      };
      if (data.bill_id !== billId) return;
      switch (msg.type) {
        case "bill:extraction:started":
          setEvent({ phase: "started", billId });
          break;
        case "bill:extraction:progress":
          setEvent({ phase: "progress", billId, note: data.note });
          break;
        case "bill:extraction:completed":
          setEvent({
            phase: "completed",
            billId,
            status: data.status,
            method: data.method,
            confidence: data.confidence,
            needsReview: data.needs_review,
          });
          break;
        case "bill:extraction:failed":
          setEvent({ phase: "failed", billId, error: data.error });
          break;
        default:
          // ignore other bill:* events (e.g. bill:imported, bill:alert:*)
          break;
      }
    });
    return unsub;
  }, [billId]);

  return event;
}
