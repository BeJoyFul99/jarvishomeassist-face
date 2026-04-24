"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
  useReextract,
  useUpdateBill,
  useUpdateLineItem,
  billPdfUrl,
  type UtilityBill,
  type UtilityBillLineItem,
  type UtilityBillMeter,
  type UtilityType,
  type PaymentStatus,
} from "@/lib/bills";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/useToast";
import { MarkPaidDialog } from "@/components/utilities/MarkPaidDialog";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function money(n: number, currency = "CAD") {
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "CAD" ? `$${formatted}` : `$${formatted} ${currency}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
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
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  return (
    <input
      type="number"
      step="0.01"
      value={value}
      onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)}
      className={`bg-transparent border-b border-white/20 focus:border-white/60 focus:outline-none w-32 tabular-nums ${className ?? ""}`}
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
  const [filter, setFilter] = useState<UtilityType | null>(null);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [billEdits, setBillEdits] = useState<Partial<UtilityBill>>({});
  const [lineEdits, setLineEdits] = useState<Record<number, Partial<UtilityBillLineItem>>>({});

  // Mark paid dialog state
  const [markPaidOpen, setMarkPaidOpen] = useState(false);

  const { data, isLoading, error } = useBill(
    Number.isFinite(id) ? id : null,
  );
  const reextract = useReextract();
  const updateBill = useUpdateBill();
  const updateLineItem = useUpdateLineItem();
  const { toast } = useToast();

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
      toast({ title: "Saved", description: "Bill corrections applied." });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  const fade = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white px-8 py-8">
        <BackLink />
        <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-6 mt-6">
          <div className="flex items-center gap-3 text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading bill&hellip;
          </div>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white px-8 py-8">
        <BackLink />
        <Card className="rounded-[20px] border-red-500/20 bg-red-950/20 p-6 mt-6">
          <div className="flex items-center gap-3 text-red-300">
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
    <div className="min-h-screen bg-black text-white px-8 py-8 space-y-6 pb-24">
      <BackLink />

      {/* Admin action buttons */}
      {isAdmin && bill.extraction_status !== "processing" && (
        <div className="flex items-center gap-2 justify-end">
          {bill.payment_status !== "paid" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMarkPaidOpen(true)}
              className="rounded-lg border-white/20 bg-white/5 hover:bg-white/10"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark paid
            </Button>
          )}
          {!editing ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="rounded-lg border-white/20 bg-white/5 hover:bg-white/10"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          ) : null}
        </div>
      )}

      {/* Tier 1 — Hero */}
      <motion.section
        {...fade}
        className="grid gap-6 lg:grid-cols-[2fr,3fr]"
        aria-label="Bill summary"
      >
        <HeroLeft
          bill={bill}
          reduced={!!reduced}
          editing={editing}
          effectiveTotalAmount={effectiveTotalAmount}
          effectiveLateFees={effectiveLateFees}
          onTotalAmountChange={(n) => setBillEdits((prev) => ({ ...prev, total_amount: n }))}
          onLateFeesChange={(n) => setBillEdits((prev) => ({ ...prev, late_fees: n }))}
        />
        <HeroRight
          bill={bill}
          totals={totals}
          lateFees={lateFees}
          filter={filter}
          setFilter={setFilter}
        />
      </motion.section>

      {/* Extraction status banner */}
      {bill.extraction_status !== "completed" && (
        <motion.div {...fade}>
          <ExtractionBanner
            bill={bill}
            isAdmin={isAdmin}
            onReextract={() => reextract.mutate(bill.id)}
            reextracting={reextract.isPending}
          />
        </motion.div>
      )}

      {/* Tier 2 — Utility Cards */}
      <motion.section
        {...fade}
        className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
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
            currency={bill.currency}
            editing={editing}
            lineEdits={lineEdits}
            setLineEdits={setLineEdits}
          />
        ))}
      </motion.section>

      {/* Tier 2.5 — Meters */}
      {meters.length > 0 && (
        <motion.section {...fade} aria-label="Meter readings">
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
            <Button variant="ghost" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveAll(bill.id)}
              disabled={saving}
              className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90"
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
    </div>
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
  reduced,
  editing,
  effectiveTotalAmount,
  effectiveLateFees,
  onTotalAmountChange,
  onLateFeesChange,
}: {
  bill: UtilityBill;
  reduced: boolean;
  editing: boolean;
  effectiveTotalAmount: number;
  effectiveLateFees: number;
  onTotalAmountChange: (n: number) => void;
  onLateFeesChange: (n: number) => void;
}) {
  const due = bill.due_date ? new Date(bill.due_date) : null;
  const today = new Date();
  const daysToDue = due ? daysBetween(due, today) : null;

  return (
    <Card className="rounded-[20px] border-white/10 bg-gradient-to-br from-neutral-950 to-neutral-900 p-6 flex flex-col justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">
          Bill total
        </div>
        {editing ? (
          <div className="mt-2">
            <EditableAmount
              value={effectiveTotalAmount}
              onChange={onTotalAmountChange}
              className="text-[40px] leading-none font-extrabold"
            />
          </div>
        ) : (
          <div
            className="mt-2 text-[56px] leading-none font-extrabold tabular-nums"
            aria-label={`Total: ${money(bill.total_amount, bill.currency)}`}
          >
            {money(bill.total_amount, bill.currency)}
          </div>
        )}
        {bill.billing_period_start && bill.billing_period_end && (
          <div className="mt-3 text-sm text-neutral-400">
            {new Date(bill.billing_period_start).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
            {" – "}
            {new Date(bill.billing_period_end).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3 items-center">
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
                className="text-sm"
              />
            </div>
          ) : (
            <LateFeeChip amount={bill.late_fees} reduced={reduced} />
          )
        )}
      </div>
    </Card>
  );
}

// ── Tier 1 Right — proportional bar + legend filter tiles ────────────────────

function HeroRight({
  bill,
  totals,
  lateFees,
  filter,
  setFilter,
}: {
  bill: UtilityBill;
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

  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-6 flex flex-col gap-4">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">
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
            title={`${UTILITY_META[s.u].label}: ${money(s.amount, bill.currency)} (${((s.amount / sum) * 100).toFixed(0)}%)`}
          />
        ))}
      </div>

      {/* Legend filter tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                {money(s.amount, bill.currency)}
              </div>
              <div className="text-[10px] text-neutral-500">
                {((s.amount / sum) * 100).toFixed(0)}%
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ── Status chips ──────────────────────────────────────────────────────────────

function PaymentChip({ bill }: { bill: UtilityBill }) {
  const s: PaymentStatus = bill.payment_status;
  const styles: Record<PaymentStatus, string> = {
    unpaid: "bg-white/5 text-neutral-300 border-white/10",
    partial: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    paid: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    overdue: "bg-red-500/10 text-red-300 border-red-500/20",
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
        className="rounded-full px-2.5 py-1 gap-1 bg-red-500/10 text-red-300 border-red-500/20"
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
        className="rounded-full px-2.5 py-1 gap-1 bg-[#ffd60a]/10 text-[#ffd60a] border-[#ffd60a]/20"
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
  reduced,
}: {
  amount: number;
  reduced: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className="rounded-full px-2.5 py-1 gap-2 bg-red-500/10 text-red-300 border-red-500/20"
    >
      <span className="relative inline-block h-2 w-2" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-red-400" />
        {!reduced && (
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping" />
        )}
      </span>
      <span>Late fee {money(amount)}</span>
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
    <Card
      className={`rounded-[20px] border-white/10 bg-neutral-950 overflow-hidden transition-opacity ${
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
            {money(subtotal, currency)}
          </span>
        </div>
      </div>

      {/* Line items */}
      <div className="p-5 space-y-2">
        {items.map((li) => {
          const currentAmount = lineEdits[li.id]?.amount ?? li.amount;
          return (
            <div
              key={li.id}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{li.description}</div>
                {(li.usage_amount !== null || li.rate !== null) && (
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {li.usage_amount !== null && li.usage_unit
                      ? `${li.usage_amount.toLocaleString()} ${li.usage_unit}`
                      : null}
                    {li.usage_amount !== null && li.rate !== null ? " · " : ""}
                    {li.rate !== null ? `@ $${li.rate.toFixed(5)}` : null}
                  </div>
                )}
              </div>
              {editing ? (
                <EditableAmount
                  value={currentAmount}
                  onChange={(n) =>
                    setLineEdits((prev) => ({
                      ...prev,
                      [li.id]: { ...prev[li.id], amount: n },
                    }))
                  }
                  className="text-sm"
                />
              ) : (
                <div
                  className={`tabular-nums font-medium shrink-0 ${
                    li.amount < 0 ? "text-emerald-300" : "text-neutral-100"
                  }`}
                >
                  {li.amount < 0 ? "-" : ""}
                  {money(Math.abs(li.amount), currency)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Share-of-total progress bar */}
      <div className="px-5 pb-5">
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
    </Card>
  );
}

// ── Tier 2.5 — Meters table ───────────────────────────────────────────────────

function MetersTable({ meters }: { meters: UtilityBillMeter[] }) {
  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-neutral-300">
          Meter readings
        </h2>
      </div>
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
                {m.previous_read_date && (
                  <div className="text-[10px] text-neutral-500">
                    {new Date(m.previous_read_date).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" },
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell className="font-mono text-sm text-neutral-300">
                <div>{m.current_reading}</div>
                {m.current_read_date && (
                  <div className="text-[10px] text-neutral-500">
                    {new Date(m.current_read_date).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" },
                    )}
                  </div>
                )}
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
    </Card>
  );
}

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
      <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-neutral-300">
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
      </Card>
    );
  }

  if (bill.extraction_status === "needs_review") {
    return (
      <Card className="rounded-[20px] border-amber-500/30 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3 text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <div>
            <div className="font-medium">This bill needs review</div>
            <div className="text-xs text-amber-400/80">
              Extraction confidence: {bill.extraction_confidence ?? "?"}%.
              Verify amounts and edit if needed.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {bill.file_path && (
            <a
              href={billPdfUrl(bill.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-amber-200 hover:text-white transition-colors"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download PDF
            </a>
          )}
          {isAdmin && bill.file_path && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReextract}
              disabled={reextracting}
              className="rounded-lg border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
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
      </Card>
    );
  }

  if (bill.extraction_status === "failed") {
    return (
      <Card className="rounded-[20px] border-red-500/30 bg-red-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3 text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <div>
            <div className="font-medium">Extraction failed</div>
            {bill.extraction_error && (
              <div className="text-xs text-red-400/80">
                {bill.extraction_error}
              </div>
            )}
          </div>
        </div>
        {isAdmin && bill.file_path && (
          <Button
            size="sm"
            variant="outline"
            onClick={onReextract}
            disabled={reextracting}
            className="rounded-lg border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 shrink-0"
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
      </Card>
    );
  }

  return null;
}
