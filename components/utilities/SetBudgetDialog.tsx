"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { useBudgets, useUpsertBudget } from "@/lib/bills";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: number | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function SetBudgetDialog({ open, onOpenChange, propertyId }: Props) {
  const upsert = useUpsertBudget();
  const { toast } = useToast();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: budgets } = useBudgets(propertyId);
  const existing = budgets?.find(
    (b) => b.month === currentMonth && b.year === currentYear,
  );

  const [budgetAmount, setBudgetAmount] = useState<number>(0);
  const [budgetKwh, setBudgetKwh] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(80);
  const [currency, setCurrency] = useState<string>("CAD");

  // Pre-fill from existing budget whenever dialog opens
  useEffect(() => {
    if (!open) return;
    setBudgetAmount(existing?.budget_amount ?? 0);
    setBudgetKwh(existing?.budget_kwh ?? 0);
    setThreshold(existing?.alert_threshold_pct ?? 80);
    setCurrency(existing?.currency ?? "CAD");
  }, [open, existing]);

  async function submit() {
    if (!propertyId || budgetAmount <= 0) return;
    try {
      await upsert.mutateAsync({
        property_id: propertyId,
        month: currentMonth,
        year: currentYear,
        budget_amount: budgetAmount,
        budget_kwh: budgetKwh || undefined,
        alert_threshold_pct: threshold,
        currency: currency || undefined,
      });
      toast({
        title: "Budget saved",
        description: `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`,
      });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Couldn't save budget",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px] border-white/10 bg-neutral-950 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold tracking-tight">
            Budget — {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Set the monthly budget and alert threshold for this property.
          </DialogDescription>
        </DialogHeader>

        {/* Read-only month chip */}
        <div className="flex items-center gap-2 -mt-1">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs text-neutral-400 tabular-nums">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          {existing && (
            <span className="text-xs text-neutral-500">Editing existing budget</span>
          )}
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sb-amount" className="text-xs text-neutral-400">
              Budget amount *
            </Label>
            <Input
              id="sb-amount"
              type="number"
              step="0.01"
              min="0"
              value={budgetAmount}
              onChange={(e) =>
                setBudgetAmount(Number.parseFloat(e.target.value) || 0)
              }
              className="rounded-xl bg-white/5 border-white/10 text-white tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sb-threshold" className="text-xs text-neutral-400">
              Alert threshold (%)
            </Label>
            <Input
              id="sb-threshold"
              type="number"
              min={1}
              max={100}
              value={threshold}
              onChange={(e) =>
                setThreshold(
                  Math.max(1, Math.min(100, Number.parseInt(e.target.value) || 80)),
                )
              }
              className="rounded-xl bg-white/5 border-white/10 text-white tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sb-kwh" className="text-xs text-neutral-400">
              Budget in kWh (optional)
            </Label>
            <Input
              id="sb-kwh"
              type="number"
              step="1"
              min="0"
              value={budgetKwh}
              onChange={(e) =>
                setBudgetKwh(Number.parseFloat(e.target.value) || 0)
              }
              className="rounded-xl bg-white/5 border-white/10 text-white tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sb-cur" className="text-xs text-neutral-400">
              Currency
            </Label>
            <Input
              id="sb-cur"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={upsert.isPending || budgetAmount <= 0 || !propertyId}
            onClick={submit}
            className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90"
          >
            {upsert.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save budget"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
