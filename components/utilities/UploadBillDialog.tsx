"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2, AlertTriangle, Loader2, UploadCloud, FileText,
} from "lucide-react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBillExtraction } from "@/hooks/useBillExtraction";
import { useUploadBill } from "@/lib/bills";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: number | null;
  /** called when the dialog is closed while an extraction is still running */
  onBackgroundExtraction?: (billId: number) => void;
}

type Phase =
  | { kind: "pick" }
  | { kind: "uploading"; file: File }
  | { kind: "extracting"; billId: number; fileName: string }
  | { kind: "ready"; billId: number; confidence?: number; needsReview: boolean }
  | { kind: "error"; message: string };

const MAX_BYTES = 10 * 1024 * 1024;

export function UploadBillDialog({
  open,
  onOpenChange,
  propertyId,
  onBackgroundExtraction,
}: Props) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const upload = useUploadBill();

  const [phase, setPhase] = useState<Phase>({ kind: "pick" });
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to SSE for the bill we're watching (null otherwise).
  const watchingBillId = phase.kind === "extracting" ? phase.billId : null;
  const ev = useBillExtraction(watchingBillId);

  // React to extraction events.
  useEffect(() => {
    if (phase.kind !== "extracting") return;
    if (ev.phase === "completed" && ev.billId === phase.billId) {
      setPhase({
        kind: "ready",
        billId: phase.billId,
        confidence: ev.confidence,
        needsReview: !!ev.needsReview,
      });
    } else if (ev.phase === "failed" && ev.billId === phase.billId) {
      setPhase({ kind: "error", message: ev.error || "Extraction failed" });
    }
  }, [ev, phase]);

  // Reset on open.
  useEffect(() => {
    if (open) {
      setPhase({ kind: "pick" });
      setFile(null);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (phase.kind === "extracting") {
      onBackgroundExtraction?.(phase.billId);
      toast("Extraction in progress…", {
        description: "We'll notify you when it's ready.",
      });
    }
    onOpenChange(false);
  }, [phase, onBackgroundExtraction, onOpenChange]);

  const onFiles = useCallback((fl: FileList | null) => {
    if (!fl || fl.length === 0) return;
    const f = fl[0];
    if (f.size > MAX_BYTES) {
      setPhase({ kind: "error", message: "File exceeds the 10 MB limit." });
      return;
    }
    if (f.type && f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setPhase({ kind: "error", message: "Only PDF files are accepted." });
      return;
    }
    setFile(f);
    setPhase({ kind: "pick" });
  }, []);

  const doUpload = useCallback(async () => {
    if (!file || !propertyId) return;
    setPhase({ kind: "uploading", file });
    try {
      const { bill_id } = await upload.mutateAsync({ propertyId, file });
      setPhase({ kind: "extracting", billId: bill_id, fileName: file.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      let friendly = msg;
      if (msg.includes("409")) friendly = "This bill has already been uploaded for this property.";
      else if (msg.includes("413")) friendly = "File exceeds the 10 MB limit.";
      else if (msg.includes("400")) friendly = "That file couldn't be uploaded. Make sure it's a valid PDF.";
      setPhase({ kind: "error", message: friendly });
    }
  }, [file, propertyId, upload]);

  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.22 },
      };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent className="rounded-[20px] border-white/10 bg-neutral-950 text-white max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-extrabold tracking-tight">
            Upload utility bill
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            PDFs from PowerStream are extracted automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2">
          <AnimatePresence mode="wait">
            {phase.kind === "pick" && (
              <motion.div key="pick" {...motionProps}>
                <Dropzone
                  file={file}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  onFiles={onFiles}
                  onPick={() => inputRef.current?.click()}
                />
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => onFiles(e.target.files)}
                />
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="ghost" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={doUpload}
                    disabled={!file || !propertyId}
                    className="rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Upload
                  </Button>
                </div>
              </motion.div>
            )}

            {phase.kind === "uploading" && (
              <motion.div
                key="uploading"
                {...motionProps}
                className="py-8 flex flex-col items-center text-center gap-3"
              >
                <Loader2 className="h-6 w-6 animate-spin text-neutral-300" />
                <div className="font-medium">Uploading…</div>
                <div className="text-sm text-neutral-400 truncate max-w-full">
                  {phase.file.name}
                </div>
              </motion.div>
            )}

            {phase.kind === "extracting" && (
              <motion.div
                key="extracting"
                {...motionProps}
                className="py-6 flex flex-col items-center text-center gap-3"
              >
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  {!reduced && (
                    <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                  )}
                </div>
                <div className="font-medium">Extracting your bill…</div>
                <div className="text-sm text-neutral-400 truncate max-w-full">
                  {phase.fileName}
                </div>
                <p className="text-xs text-neutral-500 max-w-sm">
                  This usually takes a few seconds. You can close this window — we'll
                  notify you when it's ready.
                </p>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Close and wait
                </Button>
              </motion.div>
            )}

            {phase.kind === "ready" && (
              <motion.div
                key="ready"
                {...motionProps}
                className="py-6 flex flex-col items-center text-center gap-3"
              >
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <div className="font-medium">
                  {phase.needsReview ? "Ready for review" : "Bill ready"}
                </div>
                {typeof phase.confidence === "number" && (
                  <div className="text-sm text-neutral-400">
                    Extraction confidence: {phase.confidence}%
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/utilities/${phase.billId}`);
                    }}
                    className="rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    View bill
                  </Button>
                </div>
              </motion.div>
            )}

            {phase.kind === "error" && (
              <motion.div
                key="error"
                {...motionProps}
                className="py-6 flex flex-col items-center text-center gap-3"
              >
                <AlertTriangle className="h-10 w-10 text-red-400" />
                <div className="font-medium">Upload failed</div>
                <div className="text-sm text-red-300 max-w-sm">{phase.message}</div>
                <div className="mt-2 flex gap-2">
                  <Button variant="ghost" onClick={handleClose}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPhase({ kind: "pick" })}
                    className="rounded-xl border-white/20 bg-white/5 hover:bg-white/10"
                  >
                    Try again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Dropzone ──────────────────────────────────────────────────────────────────

function Dropzone({
  file,
  isDragging,
  setIsDragging,
  onFiles,
  onPick,
}: {
  file: File | null;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  onFiles: (fl: FileList | null) => void;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        onFiles(e.dataTransfer.files);
      }}
      className={`w-full rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none ${
        isDragging
          ? "border-[#a5b4fc] bg-[#5e5ce6]/10"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      {file ? (
        <div className="flex items-center justify-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-neutral-300" />
          <span className="font-medium">{file.name}</span>
          <span className="text-neutral-500">
            ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-sm">
          <UploadCloud className="h-8 w-8 text-neutral-400" />
          <span className="font-medium">Drop a PDF or click to choose</span>
          <span className="text-xs text-neutral-500">Max 10 MB · PowerStream PDFs only</span>
        </div>
      )}
    </button>
  );
}
