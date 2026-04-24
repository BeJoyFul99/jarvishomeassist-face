"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  Plus, Receipt, AlertTriangle, CheckCircle2, Clock, Loader2,
  Home as HomeIcon, TrendingUp, Target, Gauge, FileWarning,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  useBills, useProperties, useBudgets, usePace,
  type UtilityBill, type ExtractionStatus, type PaymentStatus,
} from "@/lib/bills";
import { useUtilityPropertyStore } from "@/store/useUtilityPropertyStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/useToast";
import { useBillExtraction } from "@/hooks/useBillExtraction";
import { UploadBillDialog } from "@/components/utilities/UploadBillDialog";
import { AddPropertyDialog } from "@/components/utilities/AddPropertyDialog";
import { ManualBillDialog } from "@/components/utilities/ManualBillDialog";
import { BudgetPaceCard } from "@/components/utilities/BudgetPaceCard";
import { SetBudgetDialog } from "@/components/utilities/SetBudgetDialog";
import { BillTableSkeleton } from "@/components/utilities/Skeletons";
import { GhostBillPreview } from "@/components/utilities/GhostBillPreview";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

type Tab = "bills" | "budget" | "meters";

export default function UtilitiesPage() {
  const reduced = useReducedMotion();
  const effectiveRole = useAuthStore((s) => s.effectiveRole());
  const isAdmin = effectiveRole === "administrator";
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("bills");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [manualBillOpen, setManualBillOpen] = useState(false);
  const [setBudgetOpen, setSetBudgetOpen] = useState(false);
  const [backgroundBillId, setBackgroundBillId] = useState<number | null>(null);
  const bgEv = useBillExtraction(backgroundBillId);

  const { data: properties, isLoading: propsLoading, isError: propsError, refetch: refetchProps } =
    useProperties();
  const { currentPropertyId, setCurrentPropertyId } = useUtilityPropertyStore();

  useEffect(() => {
    if (!properties || properties.length === 0) return;
    if (currentPropertyId === null || !properties.some((p) => p.id === currentPropertyId)) {
      setCurrentPropertyId(properties[0].id);
    }
  }, [properties, currentPropertyId, setCurrentPropertyId]);

  const { data: bills, isLoading: billsLoading, isError: billsError } = useBills(
    currentPropertyId ? { property_id: currentPropertyId } : {},
  );

  const { data: pace } = usePace(
    currentPropertyId,
    new Date().getMonth() + 1,
    new Date().getFullYear(),
  );
  const { data: budgets } = useBudgets(currentPropertyId);
  const now = new Date();
  const currentBudget = budgets?.find(
    (b) => b.month === now.getMonth() + 1 && b.year === now.getFullYear(),
  );

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
        description: bgEv.error,
        variant: "destructive",
      });
    }
  }, [bgEv, backgroundBillId, toast]);

  // ── Derived stats ─────────────────────────────────────────
  const propertyCount = properties?.length ?? 0;
  const billsThisMonth = useMemo(() => {
    if (!bills) return 0;
    const m = now.getMonth();
    const y = now.getFullYear();
    return bills.filter((b) => {
      if (!b.statement_date) return false;
      const d = new Date(b.statement_date);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills]);
  const projected = pace?.projection?.projected ?? 0;
  const budgetPct =
    currentBudget && currentBudget.budget_amount > 0 && projected > 0
      ? (projected / currentBudget.budget_amount) * 100
      : 0;

  const hasProperties = propertyCount > 0;
  const hasBills = (bills?.length ?? 0) > 0;
  const initialLoading = propsLoading || (hasProperties && billsLoading);

  // Suppress unused-var lint for router (kept for future nav needs)
  void router;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen bg-background text-foreground px-6 md:px-8 py-8 space-y-6"
    >
      {/* Header */}
      <motion.header
        variants={item}
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Utilities</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bills, meters, budgets, and AI-powered insights.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {properties && properties.length > 1 && (
            <Select
              value={currentPropertyId?.toString() ?? ""}
              onValueChange={(v) => setCurrentPropertyId(Number(v))}
            >
              <SelectTrigger className="w-48 rounded-xl border-white/10 bg-white/5 backdrop-blur">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => setAddPropertyOpen(true)}
                className="rounded-xl border-white/15 bg-white/5 hover:bg-white/10"
              >
                Add property
              </Button>
              {currentPropertyId !== null && (
                <Button
                  variant="outline"
                  onClick={() => setManualBillOpen(true)}
                  className="rounded-xl border-white/15 bg-white/5 hover:bg-white/10"
                >
                  Manual entry
                </Button>
              )}
              <Button
                onClick={() => setUploadOpen(true)}
                disabled={currentPropertyId === null}
                className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload Bill
              </Button>
            </>
          )}
        </div>
      </motion.header>

      {/* Error banner if properties query fails (likely backend not reachable) */}
      {propsError && (
        <motion.div variants={item}>
          <Card className="rounded-[20px] border-red-500/20 bg-red-500/5 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-red-300">
              <FileWarning className="h-4 w-4" />
              <div>
                <div className="font-medium">Couldn&apos;t load properties</div>
                <div className="text-xs text-red-400/80">Check that the backend is reachable.</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchProps()} className="rounded-lg">
              Retry
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Stat cards — always visible */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={HomeIcon}
          color="text-cyan"
          label="Properties"
          value={propsLoading ? "…" : hasProperties ? String(propertyCount) : "—"}
          sub={hasProperties ? `${propertyCount} active` : "Add your first"}
        />
        <StatCard
          icon={Receipt}
          color="text-primary"
          label="Bills This Month"
          value={billsLoading ? "…" : hasBills ? String(billsThisMonth) : "—"}
          sub={hasBills ? `${bills?.length ?? 0} total` : "No bills yet"}
        />
        <StatCard
          icon={TrendingUp}
          color="text-emerald"
          label="Projected"
          value={projected > 0 ? formatMoney(projected, currentBudget?.currency ?? "CAD") : "—"}
          sub={
            pace?.projection?.baseline === "yoy"
              ? "YoY baseline"
              : pace?.projection?.baseline === "trailing_3mo"
                ? "3-mo avg"
                : "Needs data"
          }
        />
        <StatCard
          icon={Target}
          color="text-amber"
          label="Budget Used"
          value={currentBudget && currentBudget.budget_amount > 0 ? `${budgetPct.toFixed(0)}%` : "—"}
          sub={
            currentBudget && currentBudget.budget_amount > 0
              ? `${formatMoney(projected, currentBudget.currency)} / ${formatMoney(currentBudget.budget_amount, currentBudget.currency)}`
              : "No budget set"
          }
        />
      </motion.div>

      {/* Tabs — hidden entirely when no properties */}
      {hasProperties && (
        <motion.div
          variants={item}
          className="flex gap-1 p-1 bg-secondary/40 backdrop-blur-md border border-white/5 rounded-xl w-full md:w-fit relative"
        >
          {(["bills", "budget", "meters"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative flex-1 md:flex-initial px-3 md:px-5 py-2 rounded-lg text-xs font-semibold transition-colors z-10 capitalize whitespace-nowrap",
                tab === t ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === t && (
                <motion.div
                  layoutId="activeUtilityTab"
                  className="absolute inset-0 bg-primary shadow-[0_0_15px_-5px_hsl(var(--primary)/0.4)] rounded-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{t}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Content */}
      <motion.div variants={item} className="space-y-4">
        <AnimatePresence mode="wait">
          {!hasProperties ? (
            <motion.div
              key="no-properties"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {propsLoading ? (
                <BillTableSkeleton rows={4} />
              ) : (
                <EmptyProperties isAdmin={isAdmin} onAdd={() => setAddPropertyOpen(true)} />
              )}
            </motion.div>
          ) : tab === "bills" ? (
            <motion.div
              key="bills"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {initialLoading ? (
                <BillTableSkeleton rows={5} />
              ) : hasBills ? (
                <BillsTable bills={bills!} />
              ) : (
                <EmptyBills isAdmin={isAdmin} onUpload={() => setUploadOpen(true)} />
              )}
              {billsError && !initialLoading && (
                <Card className="rounded-[20px] border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
                  Couldn&apos;t load bills for this property.
                </Card>
              )}
            </motion.div>
          ) : tab === "budget" ? (
            <motion.div
              key="budget"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {currentPropertyId !== null && (
                <BudgetPaceCard
                  propertyId={currentPropertyId}
                  isAdmin={isAdmin}
                  onSetBudget={() => setSetBudgetOpen(true)}
                />
              )}
              {isAdmin && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setSetBudgetOpen(true)}
                    className="rounded-xl border-white/15 bg-white/5 hover:bg-white/10"
                  >
                    <Target className="h-3.5 w-3.5 mr-2" />
                    {currentBudget ? "Edit budget" : "Set budget"}
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="meters"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <MetersSummary bills={bills ?? []} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dialogs */}
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
      <SetBudgetDialog
        open={setBudgetOpen}
        onOpenChange={setSetBudgetOpen}
        propertyId={currentPropertyId}
      />
    </motion.div>
  );
}

// ── Helpers & subcomponents ─────────────────────────────────

function formatMoney(n: number, currency = "CAD") {
  const f = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "CAD" ? `$${f}` : `$${f} ${currency}`;
}

function StatCard({
  icon: Icon, color, label, value, sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="glass-card p-4 space-y-1">
      <div className={cn("flex items-center gap-2", color)}>
        <Icon className="w-4 h-4" />
        <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-semibold text-foreground font-mono tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
    </div>
  );
}

function BillsTable({ bills }: { bills: UtilityBill[] }) {
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-white/10">
            <TableHead className="text-muted-foreground font-medium">Statement</TableHead>
            <TableHead className="text-muted-foreground font-medium">Due</TableHead>
            <TableHead className="text-muted-foreground font-medium">Status</TableHead>
            <TableHead className="text-muted-foreground font-medium">Extraction</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((b) => (
            <BillRow key={b.id} bill={b} />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function BillRow({ bill }: { bill: UtilityBill }) {
  const statement = bill.statement_date ? new Date(bill.statement_date) : null;
  const due = bill.due_date ? new Date(bill.due_date) : null;
  const fmt = (d: Date | null) => {
    if (!d || Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };
  return (
    <TableRow className="border-white/5 hover:bg-white/5 transition-colors">
      <TableCell>
        <Link href={`/utilities/${bill.id}`} className="block font-medium">{fmt(statement)}</Link>
      </TableCell>
      <TableCell>
        <Link href={`/utilities/${bill.id}`} className="block text-muted-foreground" tabIndex={-1}>
          {fmt(due)}
        </Link>
      </TableCell>
      <TableCell>
        <Link href={`/utilities/${bill.id}`} tabIndex={-1} className="inline-block">
          <PaymentBadge status={bill.payment_status} />
        </Link>
      </TableCell>
      <TableCell>
        <Link href={`/utilities/${bill.id}`} tabIndex={-1} className="inline-block">
          <ExtractionBadge status={bill.extraction_status} />
        </Link>
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        <Link href={`/utilities/${bill.id}`} tabIndex={-1} className="block">
          {formatMoney(bill.total_amount, bill.currency)}
        </Link>
      </TableCell>
    </TableRow>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone: Record<PaymentStatus, string> = {
    unpaid: "bg-white/5 text-muted-foreground border-white/10",
    partial: "bg-amber/10 text-amber border-amber/20",
    paid: "bg-emerald/10 text-emerald border-emerald/20",
    overdue: "bg-crimson/10 text-crimson border-crimson/20",
  };
  const Icon = status === "paid" ? CheckCircle2 : status === "overdue" ? AlertTriangle : Clock;
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 gap-1", tone[status])}>
      <Icon className="h-3 w-3" aria-hidden />
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

function ExtractionBadge({ status }: { status: ExtractionStatus }) {
  if (status === "processing") {
    return (
      <Badge variant="outline" className="rounded-full bg-white/5 text-muted-foreground border-white/10 gap-1">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Processing
      </Badge>
    );
  }
  if (status === "needs_review") {
    return (
      <Badge variant="outline" className="rounded-full bg-amber/10 text-amber border-amber/20">
        Needs review
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="outline" className="rounded-full bg-crimson/10 text-crimson border-crimson/20">
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-full bg-emerald/10 text-emerald border-emerald/20">
      Completed
    </Badge>
  );
}

function EmptyProperties({ isAdmin, onAdd }: { isAdmin: boolean; onAdd: () => void }) {
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-8 md:p-10 overflow-hidden">
      <div className="grid gap-8 md:grid-cols-[1fr,1.3fr] md:items-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/5 border border-white/10 text-xs text-neutral-300">
            <Receipt className="h-3.5 w-3.5" />
            Getting started
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Track your utility bills</h2>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Add a property to start uploading PowerStream PDFs. Bills are extracted
            automatically — you&apos;ll see the breakdown by utility, budget pace, and
            payment status.
          </p>
          {isAdmin && (
            <div className="pt-1">
              <Button
                onClick={onAdd}
                className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add your first property
              </Button>
            </div>
          )}
        </div>
        <GhostBillPreview />
      </div>
    </Card>
  );
}

function EmptyBills({ isAdmin, onUpload }: { isAdmin: boolean; onUpload: () => void }) {
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-8 md:p-10 overflow-hidden">
      <div className="grid gap-8 md:grid-cols-[1fr,1.3fr] md:items-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/5 border border-white/10 text-xs text-neutral-300">
            <Receipt className="h-3.5 w-3.5" />
            No bills yet
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Upload your first PowerStream bill</h2>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Drag a PDF into the upload dialog. Our parser extracts the total, breakdown by utility,
            meter readings, and due date. You can review and correct anything before it lands in your history.
          </p>
          {isAdmin ? (
            <div className="pt-1 flex gap-2 flex-wrap">
              <Button
                onClick={onUpload}
                className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" /> Upload bill
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Ask an admin to upload a bill to get started.</p>
          )}
        </div>
        <GhostBillPreview />
      </div>
    </Card>
  );
}

function MetersSummary({ bills }: { bills: UtilityBill[] }) {
  if (bills.length === 0) {
    return (
      <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-8 text-center">
        <Gauge className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 text-lg font-semibold">No meter readings yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
          Meter readings appear here once a bill has been uploaded and extracted.
        </p>
      </Card>
    );
  }
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-6">
      <div className="flex items-center gap-2 text-primary">
        <Gauge className="h-4 w-4" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Recent readings
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Open an individual bill to see its meter readings and usage calculations.
      </p>
      <div className="mt-3 space-y-1.5">
        {bills.slice(0, 3).map((b) => (
          <Link
            key={b.id}
            href={`/utilities/${b.id}`}
            className="block rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors px-4 py-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {b.statement_date
                  ? new Date(b.statement_date).toLocaleDateString(undefined, { month: "long", year: "numeric" })
                  : `Bill #${b.id}`}
              </span>
              <span className="text-muted-foreground">View readings →</span>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
