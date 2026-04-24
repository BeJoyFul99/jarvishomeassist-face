"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBudgets, usePace } from "@/lib/bills";
import { BudgetPaceSkeleton } from "@/components/utilities/Skeletons";

interface Props {
  propertyId: number;
  isAdmin: boolean;
  onSetBudget: () => void;
}

function money(n: number, currency = "CAD") {
  const f = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "CAD" ? `$${f}` : `$${f} ${currency}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Baseline = "yoy" | "trailing_3mo" | "unknown";

const baselineStyles: Record<Baseline, string> = {
  yoy: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  trailing_3mo: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  unknown: "bg-white/5 text-neutral-400 border-white/10",
};

const baselineLabel: Record<Baseline, string> = {
  yoy: "YoY baseline",
  trailing_3mo: "3-month average",
  unknown: "No baseline",
};

export function BudgetPaceCard({ propertyId, isAdmin, onSetBudget }: Props) {
  const reduced = useReducedMotion();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: pace, isLoading: paceLoading } = usePace(propertyId, month, year);
  const { data: budgets } = useBudgets(propertyId);

  const currentBudget = budgets?.find((b) => b.month === month && b.year === year);
  const budgetAmount = currentBudget?.budget_amount ?? 0;
  const threshold = currentBudget?.alert_threshold_pct ?? 80;
  const projected = pace?.projection?.projected ?? 0;
  const baseline: Baseline = (pace?.projection?.baseline ?? "unknown") as Baseline;
  const currency = currentBudget?.currency ?? "CAD";

  const pct = budgetAmount > 0 ? Math.min(200, (projected / budgetAmount) * 100) : 0;
  const barClass =
    pct <= threshold
      ? "from-[#30d158] to-[#6ee7b7]"
      : pct <= 100
      ? "from-[#ffd60a] to-[#f59e0b]"
      : "from-[#ff453a] to-[#ff6961]";

  // While pace loads, render a skeleton to avoid layout jitter
  if (paceLoading) return <BudgetPaceSkeleton />;

  // Compact empty state: no baseline, no budget, no projection to show
  if (baseline === "unknown" && budgetAmount === 0 && projected === 0) {
    return (
      <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-6">
        <div className="flex flex-col items-center gap-3 text-center py-2">
          <Sparkles className="h-6 w-6 text-neutral-500" aria-hidden />
          <p className="text-sm text-neutral-400">
            {isAdmin
              ? "Set a monthly budget to track spend and receive alerts."
              : "No budget or baseline data is available yet for this property."}
          </p>
          {isAdmin && (
            <Button
              onClick={onSetBudget}
              size="sm"
              className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90"
            >
              Set budget
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-[20px] border-white/10 bg-neutral-950 p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Left column */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">
            Budget — {MONTH_NAMES[month - 1]} {year}
          </div>
          {budgetAmount > 0 ? (
            <>
              <div className="mt-1 text-[40px] leading-none font-extrabold tabular-nums">
                {money(budgetAmount, currency)}
                <span className="text-lg font-normal text-neutral-400"> / month</span>
              </div>
              <div className="mt-1 text-sm text-neutral-400">Alerts at {threshold}%</div>
            </>
          ) : (
            <div className="mt-2 flex flex-col gap-2 items-start">
              <div className="text-sm text-neutral-400">No budget set for this month.</div>
              {isAdmin && (
                <Button
                  onClick={onSetBudget}
                  size="sm"
                  className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90"
                >
                  Set budget
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col sm:items-end gap-2">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">
            Projected this month
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neutral-300" aria-hidden />
            <span className="text-[28px] leading-none font-extrabold tabular-nums">
              {money(projected, currency)}
            </span>
          </div>
          <Badge
            variant="outline"
            className={`rounded-full px-2.5 py-0.5 gap-1 text-xs ${baselineStyles[baseline]}`}
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            {baselineLabel[baseline]}
          </Badge>
          {pace?.projection?.reference_note && (
            <div className="text-[11px] text-neutral-500 max-w-xs sm:text-right">
              {pace.projection.reference_note}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar — only shown when a budget is set */}
      {budgetAmount > 0 ? (
        <div className="mt-6">
          <div className="relative h-2.5 rounded-full overflow-hidden bg-white/5">
            {reduced ? (
              <div
                className={`h-full bg-gradient-to-r ${barClass}`}
                style={{ width: `${Math.min(100, pct)}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Projected spend ${pct.toFixed(0)}% of budget`}
              />
            ) : (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, pct)}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className={`h-full bg-gradient-to-r ${barClass}`}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Projected spend ${pct.toFixed(0)}% of budget`}
              />
            )}
            {/* Threshold tick */}
            <div
              className="absolute top-0 bottom-0 w-px bg-white/30"
              style={{ left: `${threshold}%` }}
              aria-hidden
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-400 tabular-nums">
            <span>{money(projected, currency)} projected</span>
            <span
              className={
                pct > 100
                  ? "text-red-300"
                  : pct > threshold
                  ? "text-amber-300"
                  : "text-neutral-400"
              }
            >
              {pct.toFixed(0)}% of budget
            </span>
            <span>{money(budgetAmount, currency)}</span>
          </div>
          {pct > 100 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-300">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Projected to exceed budget by {money(projected - budgetAmount, currency)}
            </div>
          )}
        </div>
      ) : (
        /* CTA when projection exists but no budget is set */
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-neutral-400">
            Set a monthly budget to see alerts and pace.
          </p>
          {isAdmin && (
            <Button
              onClick={onSetBudget}
              size="sm"
              className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90 shrink-0"
            >
              Set budget
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
