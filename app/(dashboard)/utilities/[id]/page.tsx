"use client";

import { memo, use, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { staggerContainer, fadeUpItem } from "@/lib/motion";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Zap,
  Droplets,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useBill,
  useProperties,
  useReextract,
  useUpdateBill,
  useUpdateLineItem,
  billPdfUrl,
  billPdfDownloadUrl,
  type UtilityBill,
  type UtilityBillLineItem,
  type UtilityBillMeter,
  type UtilityType,
  type PaymentStatus,
  type Property,
} from "@/lib/bills";
import { useAuthStore } from "@/store/useAuthStore";
import { useCurrency } from "@/store/usePreferencesStore";
import { formatMoney, currencySymbol } from "@/lib/currency";
import { toast } from "sonner";
import { MarkPaidDialog } from "@/components/utilities/MarkPaidDialog";
import BillPdfDialog from "@/components/utilities/BillPdfDialog";
import {
  HeroSkeleton,
  UtilityCardsSkeleton,
  MetersSkeleton,
} from "@/components/utilities/Skeletons";

// ── Palette & metadata ────────────────────────────────────────────────────────

const UTILITY_META: Record<
  UtilityType,
  {
    label: string;
    gradient: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  electricity: {
    label: "Electricity",
    gradient: "from-[#5e5ce6] to-[#a5b4fc]",
    icon: Zap,
  },
  water: {
    label: "Water",
    gradient: "from-[#30d158] to-[#6ee7b7]",
    icon: Droplets,
  },
  hvac: {
    label: "HVAC",
    gradient: "from-[#bf5af2] to-[#d4b5ff]",
    icon: Flame,
  },
  other: {
    label: "Other",
    gradient: "from-[#ff453a] to-[#ff6961]",
    icon: AlertTriangle,
  },
};

const ORDER: UtilityType[] = ["electricity", "water", "hvac", "other"];

const container = staggerContainer(0.06);

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Parse a bill date coming from the backend. Returns null for missing values
 * and for Go's zero-value `time.Time` (year 1) that serializes as
 * "0001-01-01T00:00:00Z" when extraction could not determine a date.
 */
function parseBillDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() < 1900) return null;
  return d;
}

function computeUtilityTotals(
  items: UtilityBillLineItem[],
): Partial<Record<UtilityType, number>> {
  const out: Partial<Record<UtilityType, number>> = {};
  for (const li of items) {
    out[li.utility_type] = (out[li.utility_type] ?? 0) + li.amount;
  }
  return out;
}

// ── Editable amount input ─────────────────────────────────────────────────────

function EditableAmount({
  value,
  onChange,
  currency,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  currency: string;
  className?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={`text-neutral-400 ${className ?? ""}`} aria-hidden>
        {currencySymbol(currency)}
      </span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)}
        className={`bg-transparent border-b border-white/20 focus:border-white/60 focus:outline-none w-32 tabular-nums ${className ?? ""}`}
      />
    </span>
  );
}

function EditableText({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-transparent border-b border-white/20 focus:border-white/60 focus:outline-none text-right ${className ?? ""}`}
    />
  );
}

/** Convert a backend ISO/RFC3339 date to the YYYY-MM-DD a date input expects. */
function toDateInputValue(iso: string | null | undefined): string {
  const d = parseBillDate(iso);
  if (!d) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convert a date input's YYYY-MM-DD back to an RFC3339 timestamp the API accepts. */
function fromDateInputValue(v: string): string {
  return v ? `${v}T00:00:00Z` : "";
}

function EditableDate({
  value,
  onChange,
  className,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type="date"
      value={toDateInputValue(value)}
      onChange={(e) => onChange(fromDateInputValue(e.target.value))}
      className={`bg-transparent border-b border-white/20 focus:border-white/60 focus:outline-none tabular-nums [color-scheme:dark] ${className ?? ""}`}
    />
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BillDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const id = Number(params.id);
  const reduced = useReducedMotion();
  const effectiveRole = useAuthStore((s) => s.effectiveRole());
  const isAdmin = effectiveRole === "administrator";
  // The user's preference is the display currency everywhere on this page;
  // `bill.currency` is an unvalidated free-text field and there is no FX here.
  const currency = useCurrency();
  const [filter, setFilter] = useState<UtilityType | null>(null);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [billEdits, setBillEdits] = useState<Partial<UtilityBill>>({});
  const [lineEdits, setLineEdits] = useState<Record<number, Partial<UtilityBillLineItem>>>({});

  // Mark paid dialog state
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const { data, isLoading, error } = useBill(
    Number.isFinite(id) ? id : null,
  );
  const { data: properties } = useProperties();
  const property =
    properties?.find((p) => p.id === data?.bill.property_id) ?? null;
  const reextract = useReextract();
  const updateBill = useUpdateBill();
  const updateLineItem = useUpdateLineItem();

  const saving = updateBill.isPending || updateLineItem.isPending;

  function cancelEdit() {
    setEditing(false);
    setBillEdits({});
    setLineEdits({});
  }

  async function saveAll(billId: number) {
    try {
      const promises: Promise<unknown>[] = [];
      if (Object.keys(billEdits).length > 0) {
        promises.push(updateBill.mutateAsync({ id: billId, patch: billEdits }));
      }
      for (const [lineId, patch] of Object.entries(lineEdits)) {
        if (Object.keys(patch).length === 0) continue;
        promises.push(updateLineItem.mutateAsync({ billId, lineId: Number(lineId), patch }));
      }
      await Promise.all(promises);
      setEditing(false);
      setBillEdits({});
      setLineEdits({});
      toast.success("Saved", { description: "Bill corrections applied." });
    } catch (e) {
      toast.error("Save failed", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-6 sm:px-6 md:px-8 md:py-8 space-y-6">
        <BackLink />
        <HeroSkeleton />
        <UtilityCardsSkeleton />
        <MetersSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <BackLink />
        <Card className="glass-card border-crimson/20 bg-crimson/5 p-5 mt-6">
          <div className="flex items-center gap-3 text-sm text-crimson">
            <AlertCircle className="h-4 w-4" aria-hidden />
            Couldn&apos;t load this bill.
          </div>
        </Card>
      </div>
    );
  }

  const { bill, line_items, meters } = data;
  const totals = computeUtilityTotals(line_items);
  const lateFees = bill.late_fees || 0;

  // Effective bill values (merge edits over live data)
  const effectiveTotalAmount = billEdits.total_amount ?? bill.total_amount;
  const effectiveLateFees = billEdits.late_fees ?? lateFees;

  return (
    <motion.div
      variants={container}
      initial={reduced ? false : "hidden"}
      animate="show"
      className="min-h-screen bg-background text-foreground px-4 py-6 sm:px-6 md:px-8 md:py-8 space-y-6 pb-28"
    >
      <BackLink />

      {/* Action buttons — PDF access for everyone, admin actions gated */}
      {(bill.file_path || (isAdmin && bill.extraction_status !== "processing")) && (
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {bill.file_path && (
            <>
              <Button
                variant="outline"
                onClick={() => setPdfOpen(true)}
                className="rounded-lg border-white/20 bg-white/5 hover:bg-white/10"
              >
                <FileText className="h-3.5 w-3.5 mr-1" /> View PDF
              </Button>
              <Button
                variant="outline"
                asChild
                className="rounded-lg border-white/20 bg-white/5 hover:bg-white/10"
              >
                <a href={billPdfDownloadUrl(bill.id)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Download
                </a>
              </Button>
            </>
          )}
          {isAdmin && bill.extraction_status !== "processing" && bill.payment_status !== "paid" && (
            <Button
              variant="outline"
              onClick={() => setMarkPaidOpen(true)}
              className="rounded-lg border-white/20 bg-white/5 hover:bg-white/10"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark paid
            </Button>
          )}
          {isAdmin && bill.extraction_status !== "processing" && !editing ? (
            <Button
              variant="outline"
              onClick={() => setEditing(true)}
              className="rounded-lg border-white/20 bg-white/5 hover:bg-white/10"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          ) : null}
        </div>
      )}

      {bill.file_path && (
        <BillPdfDialog
          billId={bill.id}
          open={pdfOpen}
          onOpenChange={setPdfOpen}
        />
      )}

      {/* Tier 1 — Hero */}
      <motion.section
        variants={fadeUpItem}
        className="grid gap-4 lg:grid-cols-[2fr,3fr]"
        aria-label="Bill summary"
      >
        <HeroLeft
          bill={bill}
          currency={currency}
          editing={editing}
          billEdits={billEdits}
          setBillEdits={setBillEdits}
          effectiveTotalAmount={effectiveTotalAmount}
          effectiveLateFees={effectiveLateFees}
          onTotalAmountChange={(n) => setBillEdits((prev) => ({ ...prev, total_amount: n }))}
          onLateFeesChange={(n) => setBillEdits((prev) => ({ ...prev, late_fees: n }))}
        />
        <HeroRight
          bill={bill}
          currency={currency}
          totals={totals}
          lateFees={lateFees}
          filter={filter}
          setFilter={setFilter}
        />
      </motion.section>

      {/* Extraction status banner */}
      {bill.extraction_status !== "completed" && (
        <motion.div variants={fadeUpItem}>
          <ExtractionBanner
            bill={bill}
            isAdmin={isAdmin}
            onReextract={() => reextract.mutate(bill.id)}
            reextracting={reextract.isPending}
          />
        </motion.div>
      )}

      {/* Skeleton utility cards while extraction is still running */}
      {bill.extraction_status === "processing" && line_items.length === 0 && (
        <UtilityCardsSkeleton />
      )}

      {/* Tier 1.5 — Statement details + Payment activity */}
      <motion.section
        variants={fadeUpItem}
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
        aria-label="Statement details and payment activity"
      >
        <StatementDetailsCard
          bill={bill}
          property={property}
          editing={editing}
          billEdits={billEdits}
          setBillEdits={setBillEdits}
        />
        <PaymentActivityCard
          bill={bill}
          currency={currency}
          editing={editing}
          billEdits={billEdits}
          setBillEdits={setBillEdits}
        />
      </motion.section>

      {/* Tier 2 — Utility Cards */}
      <motion.section
        variants={fadeUpItem}
        className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
        aria-label="Utility breakdown"
      >
        {ORDER.filter((u) => (totals[u] ?? 0) !== 0).map((u) => (
          <UtilityCard
            key={u}
            utility={u}
            items={line_items.filter((li) => li.utility_type === u)}
            subtotal={totals[u] ?? 0}
            totalAmount={bill.total_amount}
            dim={filter !== null && filter !== u}
            currency={currency}
            editing={editing}
            lineEdits={lineEdits}
            setLineEdits={setLineEdits}
          />
        ))}
      </motion.section>

      {/* Tier 2.25 — Bill Total Reconciliation */}
      <motion.section variants={fadeUpItem} aria-label="Bill total reconciliation">
        <BillTotalSummary bill={bill} currency={currency} totals={totals} />
      </motion.section>

      {/* Tier 2.5 — Meters */}
      {meters.length > 0 && (
        <motion.section variants={fadeUpItem} aria-label="Meter readings">
          <MetersTable meters={meters} />
        </motion.section>
      )}

      {/* Sticky Save / Cancel bar */}
      {editing && (
        <motion.div
          initial={reduced ? undefined : { y: 60 }}
          animate={reduced ? undefined : { y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-neutral-950/90 backdrop-blur px-4 py-2 shadow-2xl">
            <span className="text-xs text-neutral-400 mr-2">Editing</span>
            <Button variant="ghost" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button
              onClick={() => saveAll(bill.id)}
              disabled={saving}
              className="rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Mark paid dialog */}
      <MarkPaidDialog
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        billId={bill.id}
        totalAmount={bill.total_amount}
      />
    </motion.div>
  );
}

// ── BackLink ──────────────────────────────────────────────────────────────────

function BackLink() {
  return (
    <Link
      href="/utilities"
      className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/60 rounded-md"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      All bills
    </Link>
  );
}

// ── Tier 1 Left — totals + status chips ──────────────────────────────────────

function HeroLeft({
  bill,
  currency,
  editing,
  billEdits,
  setBillEdits,
  effectiveTotalAmount,
  effectiveLateFees,
  onTotalAmountChange,
  onLateFeesChange,
}: {
  bill: UtilityBill;
  currency: string;
  editing: boolean;
  billEdits: Partial<UtilityBill>;
  setBillEdits: React.Dispatch<React.SetStateAction<Partial<UtilityBill>>>;
  effectiveTotalAmount: number;
  effectiveLateFees: number;
  onTotalAmountChange: (n: number) => void;
  onLateFeesChange: (n: number) => void;
}) {
  const due = parseBillDate(bill.due_date);
  const today = new Date();
  const daysToDue = due ? daysBetween(due, today) : null;
  const periodStart = parseBillDate(bill.billing_period_start);
  const periodEnd = parseBillDate(bill.billing_period_end);
  const effPeriodStart = billEdits.billing_period_start ?? bill.billing_period_start;
  const effPeriodEnd = billEdits.billing_period_end ?? bill.billing_period_end;

  return (
    <div className="glass-card p-5 flex flex-col justify-between">
      <div>
        <div className="text-sm font-medium text-muted-foreground">
          Bill total
        </div>
        {editing ? (
          <div className="mt-2">
            <EditableAmount
              value={effectiveTotalAmount}
              onChange={onTotalAmountChange}
              currency={currency}
              className="text-3xl sm:text-4xl leading-none font-bold"
            />
          </div>
        ) : (
          <div
            className="mt-2 text-4xl sm:text-5xl leading-none font-bold tabular-nums"
            aria-label={`Total: ${formatMoney(bill.total_amount, currency, { alwaysCents: true })}`}
          >
            {formatMoney(bill.total_amount, currency, { alwaysCents: true })}
          </div>
        )}
        {editing ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
            <span className="text-xs text-neutral-500">Period</span>
            <EditableDate
              value={effPeriodStart}
              onChange={(v) => setBillEdits((prev) => ({ ...prev, billing_period_start: v }))}
              className="text-sm"
            />
            <span>–</span>
            <EditableDate
              value={effPeriodEnd}
              onChange={(v) => setBillEdits((prev) => ({ ...prev, billing_period_end: v }))}
              className="text-sm"
            />
          </div>
        ) : periodStart && periodEnd ? (
          <div className="mt-3 text-sm text-neutral-400">
            {periodStart.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
            {" – "}
            {periodEnd.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        ) : bill.extraction_status === "needs_review" ? (
          <div className="mt-3 text-xs text-amber">
            Billing period couldn&apos;t be read. Edit the bill or re-extract.
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 items-center">
        <PaymentChip bill={bill} />
        {due && daysToDue !== null && bill.payment_status !== "paid" && (
          <DueChip days={daysToDue} />
        )}
        {(bill.late_fees > 0 || editing) && (
          editing ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Late fee</span>
              <EditableAmount
                value={effectiveLateFees}
                onChange={onLateFeesChange}
                currency={currency}
                className="text-sm"
              />
            </div>
          ) : (
            <LateFeeChip amount={bill.late_fees} currency={currency} />
          )
        )}
      </div>
    </div>
  );
}

// ── Tier 1 Right — proportional bar + legend filter tiles ────────────────────

function HeroRight({
  bill,
  currency,
  totals,
  lateFees,
  filter,
  setFilter,
}: {
  bill: UtilityBill;
  currency: string;
  totals: Partial<Record<UtilityType, number>>;
  lateFees: number;
  filter: UtilityType | null;
  setFilter: (u: UtilityType | null) => void;
}) {
  const segments = ORDER.map((u) => ({
    u,
    amount: (totals[u] ?? 0) + (u === "other" ? lateFees : 0),
  })).filter((s) => s.amount > 0);

  const sum = segments.reduce((s, x) => s + x.amount, 0) || 1;

  if (segments.length === 0) {
    return (
      <div className="glass-card p-5 flex flex-col gap-3">
        <div className="text-sm font-medium text-muted-foreground">
          Breakdown
        </div>
        <div className="flex flex-col items-start gap-2 py-4">
          <p className="text-sm text-neutral-400">
            No line-item breakdown is available for this bill.
          </p>
          <p className="text-xs text-neutral-500">
            {bill.extraction_status === "processing"
              ? "Extraction is still running — check back in a moment."
              : "Edit the bill or re-extract to populate electricity, water, and HVAC totals."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="text-sm font-medium text-muted-foreground">
        Breakdown
      </div>

      {/* Proportional bar */}
      <div
        className="h-2 w-full rounded-full overflow-hidden bg-white/5 flex"
        role="img"
        aria-label="Utility cost distribution bar"
      >
        {segments.map((s) => (
          <div
            key={s.u}
            className={`h-full bg-gradient-to-r ${UTILITY_META[s.u].gradient}`}
            style={{ width: `${(s.amount / sum) * 100}%` }}
            title={`${UTILITY_META[s.u].label}: ${formatMoney(s.amount, currency, { alwaysCents: true })} (${((s.amount / sum) * 100).toFixed(0)}%)`}
          />
        ))}
      </div>

      {/* Legend filter tiles */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {segments.map((s) => {
          const Icon = UTILITY_META[s.u].icon;
          const active = filter === s.u;
          return (
            <button
              key={s.u}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? null : s.u)}
              className={`group text-left rounded-xl border p-3 transition-all focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none ${
                active
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-gradient-to-br ${UTILITY_META[s.u].gradient}`}
                  aria-hidden
                />
                <Icon className="h-3.5 w-3.5 text-neutral-300" aria-hidden />
                <span className="text-xs text-neutral-300">
                  {UTILITY_META[s.u].label}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold tabular-nums">
                {formatMoney(s.amount, currency, { alwaysCents: true })}
              </div>
              <div className="text-[10px] text-neutral-500">
                {((s.amount / sum) * 100).toFixed(0)}%
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Statement details ─────────────────────────────────────────────────────────

function StatementDetailsCard({
  bill,
  property,
  editing,
  billEdits,
  setBillEdits,
}: {
  bill: UtilityBill;
  property: Property | null;
  editing: boolean;
  billEdits: Partial<UtilityBill>;
  setBillEdits: React.Dispatch<React.SetStateAction<Partial<UtilityBill>>>;
}) {
  const effType = billEdits.bill_type ?? bill.bill_type;
  const effStatement = billEdits.statement_date ?? bill.statement_date;
  const effDue = billEdits.due_date ?? bill.due_date;
  const statement = parseBillDate(effStatement);
  const due = parseBillDate(effDue);
  const fmtDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";
  const billTypeTone: Record<string, string> = {
    REGULAR: "bg-emerald/10 text-emerald border-emerald/20",
    ESTIMATED: "bg-amber/10 text-amber border-amber/20",
    FINAL: "bg-crimson/10 text-crimson border-crimson/20",
  };
  const tone =
    billTypeTone[effType?.toUpperCase() ?? ""] ??
    "bg-white/5 text-neutral-300 border-white/10";

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Account",
      value: property?.account_number ? (
        <span className="font-mono tabular-nums">{property.account_number}</span>
      ) : (
        <span className="text-neutral-500">—</span>
      ),
    },
    {
      label: "Service address",
      value: property?.address || <span className="text-neutral-500">—</span>,
    },
    {
      label: "Bill type",
      value: editing ? (
        <EditableText
          value={effType ?? ""}
          onChange={(v) => setBillEdits((prev) => ({ ...prev, bill_type: v }))}
          placeholder="REGULAR"
          className="text-sm w-32"
        />
      ) : bill.bill_type ? (
        <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] ${tone}`}>
          {bill.bill_type}
        </Badge>
      ) : (
        <span className="text-neutral-500">—</span>
      ),
    },
    {
      label: "Statement date",
      value: editing ? (
        <EditableDate
          value={effStatement}
          onChange={(v) => setBillEdits((prev) => ({ ...prev, statement_date: v }))}
          className="text-sm"
        />
      ) : (
        fmtDate(statement)
      ),
    },
    {
      label: "Due date",
      value: editing ? (
        <EditableDate
          value={effDue}
          onChange={(v) => setBillEdits((prev) => ({ ...prev, due_date: v }))}
          className="text-sm"
        />
      ) : (
        fmtDate(due)
      ),
    },
  ];

  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="text-sm font-medium text-muted-foreground">
        Statement details
      </div>
      <div className="flex flex-col divide-y divide-white/5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-start justify-between gap-4 py-2 text-sm"
          >
            <span className="text-neutral-400 shrink-0">{r.label}</span>
            <span className="text-neutral-100 text-right break-words min-w-0">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment activity ──────────────────────────────────────────────────────────

function PaymentActivityCard({
  bill,
  currency,
  editing,
  billEdits,
  setBillEdits,
}: {
  bill: UtilityBill;
  currency: string;
  editing: boolean;
  billEdits: Partial<UtilityBill>;
  setBillEdits: React.Dispatch<React.SetStateAction<Partial<UtilityBill>>>;
}) {
  const prev = billEdits.previous_balance ?? bill.previous_balance ?? 0;
  const paid = billEdits.payments_received ?? bill.payments_received ?? 0;
  const fwd = billEdits.balance_forward ?? bill.balance_forward ?? 0;
  const late = billEdits.late_fees ?? bill.late_fees ?? 0;
  const hasAny = prev !== 0 || paid !== 0 || fwd !== 0 || late !== 0;

  const patch = (k: keyof UtilityBill) => (n: number) =>
    setBillEdits((p) => ({ ...p, [k]: n }));

  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="text-sm font-medium text-muted-foreground">
        Payment activity
      </div>
      {editing ? (
        <div className="flex flex-col divide-y divide-white/5">
          <EditablePaymentRow label="Previous balance" value={prev} currency={currency} onChange={patch("previous_balance")} />
          <EditablePaymentRow label="Payment received" value={paid} currency={currency} onChange={patch("payments_received")} />
          <EditablePaymentRow label="Balance forward" value={fwd} currency={currency} onChange={patch("balance_forward")} />
          <EditablePaymentRow label="Late fees" value={late} currency={currency} onChange={patch("late_fees")} />
        </div>
      ) : !hasAny ? (
        <p className="text-sm text-neutral-500 py-4">
          No prior balance or payments on this bill.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-white/5">
          <PaymentRow label="Previous balance" amount={prev} currency={currency} />
          <PaymentRow
            label="Payment received"
            amount={paid}
            currency={currency}
            positiveTone="emerald"
          />
          <PaymentRow
            label="Balance forward"
            amount={fwd}
            currency={currency}
            emphasize
          />
          {late > 0 && (
            <PaymentRow
              label="Late fees"
              amount={late}
              currency={currency}
              negativeTone="crimson"
            />
          )}
        </div>
      )}
    </div>
  );
}

function EditablePaymentRow({
  label,
  value,
  currency,
  onChange,
}: {
  label: string;
  value: number;
  currency: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-neutral-400">{label}</span>
      <EditableAmount
        value={value}
        onChange={onChange}
        currency={currency}
        className="text-sm text-right"
      />
    </div>
  );
}

function PaymentRow({
  label,
  amount,
  currency,
  positiveTone,
  negativeTone,
  emphasize,
}: {
  label: string;
  amount: number;
  currency: string;
  positiveTone?: "emerald";
  negativeTone?: "crimson";
  emphasize?: boolean;
}) {
  let cls = "text-neutral-100";
  if (emphasize) cls = "text-neutral-100 font-semibold";
  if (amount < 0 && positiveTone === "emerald") cls = "text-emerald font-medium";
  if (amount > 0 && negativeTone === "crimson") cls = "text-crimson font-medium";
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className={`tabular-nums ${cls}`}>
        {formatMoney(amount, currency, { alwaysCents: true })}
      </span>
    </div>
  );
}

// ── Bill total reconciliation ────────────────────────────────────────────────

function BillTotalSummary({
  bill,
  currency,
  totals,
}: {
  bill: UtilityBill;
  currency: string;
  totals: Partial<Record<UtilityType, number>>;
}) {
  const lateFees = bill.late_fees ?? 0;
  const prev = bill.previous_balance ?? 0;
  const paid = bill.payments_received ?? 0;
  const fwd = bill.balance_forward ?? 0;

  const subtotal = ORDER.reduce((s, u) => s + (totals[u] ?? 0), 0);
  const reconciled = subtotal + fwd + lateFees;
  const matchesTotal = Math.abs(reconciled - bill.total_amount) < 0.01;

  const chargeRows = ORDER.filter((u) => (totals[u] ?? 0) !== 0).map((u) => ({
    label: UTILITY_META[u].label,
    amount: totals[u] ?? 0,
  }));

  const hasCharges = chargeRows.length > 0;

  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-muted-foreground">
          Bill total
        </div>
        {!matchesTotal && hasCharges && (
          <span className="text-[10px] font-mono text-amber px-2 py-0.5 rounded-full bg-amber/10 border border-amber/20">
            math doesn&apos;t tie — verify amounts
          </span>
        )}
      </div>

      <div className="flex flex-col divide-y divide-white/5 text-sm">
        {hasCharges ? (
          chargeRows.map((r) => (
            <SummaryRow key={r.label} label={r.label} amount={r.amount} currency={currency} />
          ))
        ) : (
          <p className="py-3 text-sm text-neutral-500">
            Utility charges haven&apos;t been extracted yet.
          </p>
        )}

        {hasCharges && (
          <SummaryRow
            label="Subtotal"
            amount={subtotal}
            currency={currency}
            emphasize
          />
        )}

        {(prev !== 0 || paid !== 0) && (
          <>
            <SummaryRow
              label="Previous balance"
              amount={prev}
              currency={currency}
            />
            <SummaryRow
              label="Payment received"
              amount={paid}
              currency={currency}
              greenNegative
            />
          </>
        )}

        {fwd !== 0 && (
          <SummaryRow label="Balance forward" amount={fwd} currency={currency} />
        )}

        {lateFees > 0 && (
          <SummaryRow
            label="Late fees"
            amount={lateFees}
            currency={currency}
            redPositive
          />
        )}

        <div className="flex items-center justify-between py-3">
          <span className="text-sm font-semibold text-foreground">Total due</span>
          <span className="text-lg font-bold tabular-nums text-foreground">
            {formatMoney(bill.total_amount, currency, { alwaysCents: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  amount,
  currency,
  emphasize,
  greenNegative,
  redPositive,
}: {
  label: string;
  amount: number;
  currency: string;
  emphasize?: boolean;
  greenNegative?: boolean;
  redPositive?: boolean;
}) {
  let cls = "text-neutral-100";
  if (emphasize) cls = "text-neutral-100 font-semibold";
  if (greenNegative && amount < 0) cls = "text-emerald font-medium";
  if (redPositive && amount > 0) cls = "text-crimson font-medium";
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-neutral-400">{label}</span>
      <span className={`tabular-nums ${cls}`}>
        {formatMoney(amount, currency, { alwaysCents: true })}
      </span>
    </div>
  );
}

// ── Status chips ──────────────────────────────────────────────────────────────

function PaymentChip({ bill }: { bill: UtilityBill }) {
  const s: PaymentStatus = bill.payment_status;
  const styles: Record<PaymentStatus, string> = {
    unpaid: "bg-white/5 text-neutral-300 border-white/10",
    partial: "bg-amber/10 text-amber border-amber/20",
    paid: "bg-emerald/10 text-emerald border-emerald/20",
    overdue: "bg-crimson/10 text-crimson border-crimson/20",
  };
  const Icon =
    s === "paid" ? CheckCircle2 : s === "overdue" ? AlertTriangle : Clock;
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-1 gap-1.5 ${styles[s]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="capitalize text-xs">{s}</span>
    </Badge>
  );
}

function DueChip({ days }: { days: number }) {
  if (days < 0) {
    return (
      <Badge
        variant="outline"
        className="rounded-full px-2.5 py-1 gap-1 bg-crimson/10 text-crimson border-crimson/20"
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Overdue by {Math.abs(days)}d
      </Badge>
    );
  }
  if (days === 0) {
    return (
      <Badge
        variant="outline"
        className="rounded-full px-2.5 py-1 gap-1 bg-amber/10 text-amber border-amber/20"
      >
        <Clock className="h-3.5 w-3.5" aria-hidden />
        Due today
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full px-2.5 py-1 gap-1 bg-white/5 text-neutral-300 border-white/10"
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      Due in {days}d
    </Badge>
  );
}

function LateFeeChip({
  amount,
  currency,
}: {
  amount: number;
  currency: string;
}) {
  return (
    <Badge
      variant="outline"
      className="rounded-full px-2.5 py-1 gap-2 bg-crimson/10 text-crimson border-crimson/20"
    >
      <span className="inline-block h-2 w-2 rounded-full bg-crimson" aria-hidden />
      <span>Late fee {formatMoney(amount, currency, { alwaysCents: true })}</span>
    </Badge>
  );
}

// ── Tier 2 — Utility Card ────────────────────────────────────────────────────

function UtilityCard({
  utility,
  items,
  subtotal,
  totalAmount,
  dim,
  currency,
  editing,
  lineEdits,
  setLineEdits,
}: {
  utility: UtilityType;
  items: UtilityBillLineItem[];
  subtotal: number;
  totalAmount: number;
  dim: boolean;
  currency: string;
  editing: boolean;
  lineEdits: Record<number, Partial<UtilityBillLineItem>>;
  setLineEdits: React.Dispatch<React.SetStateAction<Record<number, Partial<UtilityBillLineItem>>>>;
}) {
  const meta = UTILITY_META[utility];
  const Icon = meta.icon;
  const pct =
    totalAmount > 0 ? Math.min(100, (subtotal / totalAmount) * 100) : 0;

  return (
    <div
      className={`glass-card overflow-hidden transition-opacity ${
        dim ? "opacity-40" : "opacity-100"
      }`}
      aria-label={`${meta.label} utility card`}
    >
      {/* Gradient header — black/30 overlay keeps text WCAG AA on all endpoints */}
      <div className={`relative bg-gradient-to-br ${meta.gradient} px-5 py-4`}>
        <div className="absolute inset-0 bg-black/30" aria-hidden />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-white" aria-hidden />
            <span className="text-sm font-semibold text-white">
              {meta.label}
            </span>
          </div>
          <span className="text-lg font-bold tabular-nums text-white">
            {formatMoney(subtotal, currency, { alwaysCents: true })}
          </span>
        </div>
      </div>

      {/* Line items */}
      <div className="p-4 sm:p-5 space-y-2">
        {items.map((li) => {
          const currentAmount = lineEdits[li.id]?.amount ?? li.amount;
          const currentDesc = lineEdits[li.id]?.description ?? li.description;
          const currentUsage = lineEdits[li.id]?.usage_amount ?? li.usage_amount ?? 0;
          const currentUnit = lineEdits[li.id]?.usage_unit ?? li.usage_unit ?? "";
          const currentRate = lineEdits[li.id]?.rate ?? li.rate ?? 0;
          const setField = (patch: Partial<UtilityBillLineItem>) =>
            setLineEdits((prev) => ({
              ...prev,
              [li.id]: { ...prev[li.id], ...patch },
            }));
          return (
            <div
              key={li.id}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                {editing ? (
                  <EditableText
                    value={currentDesc}
                    onChange={(v) => setField({ description: v })}
                    placeholder="Description"
                    className="text-sm font-medium w-full !text-left"
                  />
                ) : (
                  <div className="truncate font-medium">{li.description}</div>
                )}
                {editing ? (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
                    <input
                      type="number"
                      step="0.01"
                      value={currentUsage}
                      onChange={(e) =>
                        setField({ usage_amount: Number.parseFloat(e.target.value) || 0 })
                      }
                      className="bg-transparent border-b border-white/20 focus:border-white/60 focus:outline-none w-20 tabular-nums"
                      aria-label="Usage amount"
                    />
                    <EditableText
                      value={currentUnit}
                      onChange={(v) => setField({ usage_unit: v })}
                      placeholder="unit"
                      className="w-14 !text-left"
                    />
                    <span>@ {currencySymbol(currency)}</span>
                    <input
                      type="number"
                      step="0.00001"
                      value={currentRate}
                      onChange={(e) =>
                        setField({ rate: Number.parseFloat(e.target.value) || 0 })
                      }
                      className="bg-transparent border-b border-white/20 focus:border-white/60 focus:outline-none w-24 tabular-nums"
                      aria-label="Rate"
                    />
                  </div>
                ) : (
                  (li.usage_amount !== null || li.rate !== null) && (
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {li.usage_amount !== null && li.usage_unit
                        ? `${li.usage_amount.toLocaleString()} ${li.usage_unit}`
                        : null}
                      {li.usage_amount !== null && li.rate !== null ? " · " : ""}
                      {li.rate !== null
                        ? `@ ${formatMoney(li.rate, currency, { decimals: 5 })}`
                        : null}
                    </div>
                  )
                )}
              </div>
              {editing ? (
                <EditableAmount
                  value={currentAmount}
                  onChange={(n) => setField({ amount: n })}
                  currency={currency}
                  className="text-sm"
                />
              ) : (
                <div
                  className={`tabular-nums font-medium shrink-0 ${
                    li.amount < 0 ? "text-emerald" : "text-neutral-100"
                  }`}
                >
                  {li.amount < 0 ? "-" : ""}
                  {formatMoney(Math.abs(li.amount), currency, { alwaysCents: true })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Share-of-total progress bar */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        <div
          className="h-1.5 rounded-full bg-white/5 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${meta.label} is ${pct.toFixed(0)}% of the bill`}
        >
          <div
            className={`h-full bg-gradient-to-r ${meta.gradient}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-neutral-500 tracking-wide">
          {pct.toFixed(0)}% of total
        </div>
      </div>
    </div>
  );
}

// ── Tier 2.5 — Meters table ───────────────────────────────────────────────────

const MetersTable = memo(function MetersTable({ meters }: { meters: UtilityBillMeter[] }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <h2 className="text-sm font-medium text-neutral-300">
          Meter readings
        </h2>
      </div>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-white/10">
            <TableHead className="text-neutral-400">Type</TableHead>
            <TableHead className="text-neutral-400">Number</TableHead>
            <TableHead className="text-neutral-400">Previous</TableHead>
            <TableHead className="text-neutral-400">Current</TableHead>
            <TableHead className="text-right text-neutral-400">Usage</TableHead>
            <TableHead className="text-right text-neutral-400">
              Multiplier
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meters.map((m) => (
            <TableRow key={m.id} className="border-white/5 hover:bg-white/5">
              <TableCell className="capitalize">{m.meter_type}</TableCell>
              <TableCell className="font-mono text-sm">
                {m.meter_number}
              </TableCell>
              <TableCell className="font-mono text-sm text-neutral-300">
                <div>{m.previous_reading}</div>
                {(() => {
                  const d = parseBillDate(m.previous_read_date);
                  return d ? (
                    <div className="text-[10px] text-neutral-500">
                      {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  ) : null;
                })()}
              </TableCell>
              <TableCell className="font-mono text-sm text-neutral-300">
                <div>{m.current_reading}</div>
                {(() => {
                  const d = parseBillDate(m.current_read_date);
                  return d ? (
                    <div className="text-[10px] text-neutral-500">
                      {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  ) : null;
                })()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {m.usage.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                &times;{m.multiplier}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
});

// ── Extraction status banner ──────────────────────────────────────────────────

function ExtractionBanner({
  bill,
  isAdmin,
  onReextract,
  reextracting,
}: {
  bill: UtilityBill;
  isAdmin: boolean;
  onReextract: () => void;
  reextracting: boolean;
}) {
  if (bill.extraction_status === "processing") {
    return (
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-neutral-300">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Extraction in progress&hellip;
        </div>
        {bill.file_path && (
          <a
            href={billPdfUrl(bill.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-white transition-colors"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download PDF
          </a>
        )}
      </div>
    );
  }

  if (bill.extraction_status === "needs_review") {
    return (
      <div className="glass-card border-amber/30 bg-amber/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3 text-amber">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <div>
            <div className="text-sm font-medium">This bill needs review</div>
            <div className="text-xs text-amber/80">
              Extraction confidence: {bill.extraction_confidence ?? "?"}%.
              Verify amounts and edit if needed.
            </div>
            {bill.extraction_model && (
              <div className="text-[10px] font-mono text-amber/60 mt-0.5">
                Model: {bill.extraction_model}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {bill.file_path && (
            <a
              href={billPdfUrl(bill.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-amber hover:text-white transition-colors"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download PDF
            </a>
          )}
          {isAdmin && bill.file_path && (
            <Button
              variant="outline"
              onClick={onReextract}
              disabled={reextracting}
              className="rounded-lg border-amber/40 bg-amber/10 text-amber hover:bg-amber/20"
            >
              {reextracting ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden
                />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              )}
              Re-extract
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (bill.extraction_status === "failed") {
    return (
      <div className="glass-card border-crimson/30 bg-crimson/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3 text-crimson">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <div>
            <div className="text-sm font-medium">Extraction failed</div>
            {bill.extraction_error && (
              <div className="text-xs text-crimson/80">
                {bill.extraction_error}
              </div>
            )}
          </div>
        </div>
        {isAdmin && bill.file_path && (
          <Button
            variant="outline"
            onClick={onReextract}
            disabled={reextracting}
            className="rounded-lg border-crimson/40 bg-crimson/10 text-crimson hover:bg-crimson/20 shrink-0"
          >
            {reextracting ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden
              />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
            Retry
          </Button>
        )}
      </div>
    );
  }

  return null;
}
