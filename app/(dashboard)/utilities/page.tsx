"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useBills,
  useProperties,
  type UtilityBill,
  type ExtractionStatus,
  type PaymentStatus,
} from "@/lib/bills";
import { useUtilityPropertyStore } from "@/store/useUtilityPropertyStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/useToast";
import { useBillExtraction } from "@/hooks/useBillExtraction";
import { UploadBillDialog } from "@/components/utilities/UploadBillDialog";
import { AddPropertyDialog } from "@/components/utilities/AddPropertyDialog";
import { ManualBillDialog } from "@/components/utilities/ManualBillDialog";

export default function UtilitiesPage() {
  const reduced = useReducedMotion();
  const effectiveRole = useAuthStore((s) => s.effectiveRole());
  const isAdmin = effectiveRole === "administrator";
  const router = useRouter();
  const { toast } = useToast();

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [manualBillOpen, setManualBillOpen] = useState(false);
  // bill being extracted while dialog is closed
  const [backgroundBillId, setBackgroundBillId] = useState<number | null>(null);
  const bgEv = useBillExtraction(backgroundBillId);

  // Background extraction completion toast
  useEffect(() => {
    if (backgroundBillId === null) return;
    if (bgEv.phase === "completed" && bgEv.billId === backgroundBillId) {
      const id = backgroundBillId;
      setBackgroundBillId(null);
      toast({
        title: bgEv.needsReview ? "Bill ready for review" : "Bill ready",
        description: `Extraction finished. Open Utilities to view bill #${id}.`,
      });
    } else if (bgEv.phase === "failed" && bgEv.billId === backgroundBillId) {
      setBackgroundBillId(null);
      toast({
        title: "Extraction failed",
        description: bgEv.error ?? "Something went wrong during extraction.",
        variant: "destructive",
      });
    }
  }, [bgEv, backgroundBillId, toast, router]);

  const { data: properties, isLoading: propsLoading } = useProperties();
  const { currentPropertyId, setCurrentPropertyId } = useUtilityPropertyStore();

  // Auto-select first property when none is selected or the stored id is stale
  useEffect(() => {
    if (!properties || properties.length === 0) return;
    if (
      currentPropertyId === null ||
      !properties.some((p) => p.id === currentPropertyId)
    ) {
      setCurrentPropertyId(properties[0].id);
    }
  }, [properties, currentPropertyId, setCurrentPropertyId]);

  const { data: bills, isLoading: billsLoading } = useBills(
    currentPropertyId ? { property_id: currentPropertyId } : {},
  );

  const fadeUp = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: {
          duration: 0.35,
          ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        },
      };

  const isLoading = propsLoading || billsLoading;
  const hasProperties = !propsLoading && properties && properties.length > 0;
  const hasBills = bills && bills.length > 0;
  const noBills =
    !billsLoading && bills && bills.length === 0 && hasProperties;

  return (
    <div className="min-h-screen bg-black text-white px-8 py-8 space-y-6">
      {/* ── Header ── */}
      <motion.header
        {...fadeUp}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Utilities</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Bills, meters, budgets, and AI-powered insights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Property selector — shown only when there are multiple properties */}
          {properties && properties.length > 1 && (
            <Select
              value={currentPropertyId?.toString() ?? ""}
              onValueChange={(v) => setCurrentPropertyId(Number(v))}
            >
              <SelectTrigger className="w-56 rounded-xl border-white/10 bg-white/5 backdrop-blur">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name} — {p.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Admin action cluster */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setAddPropertyOpen(true)}
                className="rounded-xl border-white/20 bg-white/5 hover:bg-white/10"
              >
                Add property
              </Button>
              {currentPropertyId !== null && (
                <Button
                  variant="outline"
                  onClick={() => setManualBillOpen(true)}
                  className="rounded-xl border-white/20 bg-white/5 hover:bg-white/10"
                >
                  Manual entry
                </Button>
              )}
              <Button
                onClick={() => setUploadOpen(true)}
                disabled={currentPropertyId === null}
                className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden />
                Upload Bill
              </Button>
            </div>
          )}
        </div>
      </motion.header>

      {/* ── Loading state ── */}
      {isLoading && <LoadingCard />}

      {/* ── Empty: no properties ── */}
      {!isLoading && properties && properties.length === 0 && (
        <EmptyProperties />
      )}

      {/* ── Empty: no bills for this property ── */}
      {noBills && <EmptyBills isAdmin={isAdmin} />}

      {/* ── Bills table ── */}
      {hasBills && (
        <motion.div {...fadeUp}>
          <Card className="rounded-[20px] border-white/10 bg-neutral-950 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="text-neutral-400 font-medium">
                    Statement
                  </TableHead>
                  <TableHead className="text-neutral-400 font-medium">
                    Due
                  </TableHead>
                  <TableHead className="text-neutral-400 font-medium">
                    Status
                  </TableHead>
                  <TableHead className="text-neutral-400 font-medium">
                    Extraction
                  </TableHead>
                  <TableHead className="text-right text-neutral-400 font-medium">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((b) => (
                  <BillRow key={b.id} bill={b} />
                ))}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}

      {/* ── Upload dialog ── */}
      <UploadBillDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        propertyId={currentPropertyId}
        onBackgroundExtraction={(id) => setBackgroundBillId(id)}
      />
      <AddPropertyDialog
        open={addPropertyOpen}
        onOpenChange={setAddPropertyOpen}
        onCreated={(id) => setCurrentPropertyId(id)}
      />
      <ManualBillDialog
        open={manualBillOpen}
        onOpenChange={setManualBillOpen}
        propertyId={currentPropertyId}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BillRow({ bill }: { bill: UtilityBill }) {
  const formatDate = (raw: string | null) => {
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Each cell wraps its content in a Link so the whole row is navigable.
  // The first cell is focusable (tabIndex 0); remaining cells use tabIndex={-1}
  // so keyboard users tab row-by-row rather than cell-by-cell.
  const href = `/utilities/${bill.id}`;
  const cellLink = (children: React.ReactNode, className?: string, tabbable = false) => (
    <Link
      href={href}
      tabIndex={tabbable ? 0 : -1}
      className={`block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bf5af2] rounded ${className ?? ""}`}
    >
      {children}
    </Link>
  );

  return (
    <TableRow className="border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
      <TableCell className="font-medium">
        {cellLink(formatDate(bill.statement_date), "", true)}
      </TableCell>
      <TableCell className="text-neutral-300">
        {cellLink(formatDate(bill.due_date))}
      </TableCell>
      <TableCell>
        {cellLink(<PaymentBadge status={bill.payment_status} />)}
      </TableCell>
      <TableCell>
        {cellLink(<ExtractionBadge status={bill.extraction_status} />)}
      </TableCell>
      <TableCell className="text-right font-semibold">
        {cellLink(
          <>
            {bill.currency === "CAD" ? "$" : ""}
            {bill.total_amount.toFixed(2)}
            {bill.currency !== "CAD" && " " + bill.currency}
          </>,
          "justify-end",
        )}
      </TableCell>
    </TableRow>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone: Record<PaymentStatus, string> = {
    unpaid: "bg-white/5 text-neutral-300 border-white/10",
    partial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const Icon =
    status === "paid"
      ? CheckCircle2
      : status === "overdue"
        ? AlertTriangle
        : Clock;
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-0.5 gap-1 ${tone[status]}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

function ExtractionBadge({ status }: { status: ExtractionStatus }) {
  if (status === "processing") {
    return (
      <Badge
        variant="outline"
        className="rounded-full bg-white/5 text-neutral-300 border-white/10 gap-1"
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Processing
      </Badge>
    );
  }
  if (status === "needs_review") {
    return (
      <Badge
        variant="outline"
        className="rounded-full bg-amber-500/10 text-amber-400 border-amber-500/20"
      >
        Needs review
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge
        variant="outline"
        className="rounded-full bg-red-500/10 text-red-400 border-red-500/20"
      >
        Failed
      </Badge>
    );
  }
  // "completed"
  return (
    <Badge
      variant="outline"
      className="rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    >
      Completed
    </Badge>
  );
}

function LoadingCard() {
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-6">
      <div className="flex items-center gap-3 text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading…
      </div>
    </Card>
  );
}

function EmptyProperties() {
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-8 text-center">
      <Receipt className="mx-auto h-10 w-10 text-neutral-500" aria-hidden />
      <h3 className="mt-3 text-lg font-semibold">No properties yet</h3>
      <p className="mt-1 text-sm text-neutral-400">
        Add a property in Settings to start tracking utility bills.
      </p>
    </Card>
  );
}

function EmptyBills({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-8 text-center">
      <Receipt className="mx-auto h-10 w-10 text-neutral-500" aria-hidden />
      <h3 className="mt-3 text-lg font-semibold">No bills for this property</h3>
      <p className="mt-1 text-sm text-neutral-400">
        {isAdmin
          ? "Upload a PowerStream PDF to extract the details automatically."
          : "Ask an admin to upload a bill."}
      </p>
    </Card>
  );
}
