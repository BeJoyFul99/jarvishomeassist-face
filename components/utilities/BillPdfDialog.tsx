"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { billPdfUrl, billPdfDownloadUrl } from "@/lib/bills";

interface BillPdfDialogProps {
  billId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

/** Inline viewer for a bill's original PDF, with a named-download shortcut. */
export default function BillPdfDialog({
  billId,
  open,
  onOpenChange,
  title = "Original bill",
}: BillPdfDialogProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setLoaded(false);
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-popover border-border p-0 overflow-hidden max-w-[95vw] sm:max-w-4xl h-[88vh] flex flex-col gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-semibold text-foreground">
            {title}
          </DialogTitle>
          <a
            href={billPdfDownloadUrl(billId)}
            className="inline-flex items-center gap-1.5 mr-6 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        </DialogHeader>
        <div className="relative flex-1 bg-secondary/30">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading document…</span>
            </div>
          )}
          {open && (
            <iframe
              src={billPdfUrl(billId)}
              title="Bill PDF"
              onLoad={() => setLoaded(true)}
              className="w-full h-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
