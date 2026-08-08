"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, springItem } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Save, Loader2, Calculator } from "lucide-react";
import { toast } from "sonner";

import {
  emptyInputs,
  fetchDebtInputs,
  saveDebtInputs,
  computePlan,
  fetchCoachBrief,
  fetchDebtModels,
  type DebtInputs,
  type Plan,
} from "@/lib/debt";
import { DebtInputForm } from "@/components/debt/DebtInputForm";
import { RescuePlan } from "@/components/debt/RescuePlan";
import { useCurrency } from "@/store/usePreferencesStore";

const container = staggerContainer(0.08);
const item = springItem;

export default function DebtRescuePage() {
  const currency = useCurrency();
  const [inputs, setInputs] = useState<DebtInputs>(emptyInputs());
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [computing, setComputing] = useState(false);

  const [brief, setBrief] = useState("");
  const [coaching, setCoaching] = useState(false);
  const [model, setModel] = useState("");
  const [coachAvailable, setCoachAvailable] = useState(false);

  useEffect(() => {
    fetchDebtInputs()
      .then(setInputs)
      .catch(() => toast.error("Failed to load your saved figures"))
      .finally(() => setLoading(false));
    fetchDebtModels()
      .then(({ models, defaultModel }) => {
        setModel(defaultModel);
        setCoachAvailable(models.length > 0);
      })
      .catch(() => setCoachAvailable(false));
  }, []);

  const onInputsChange = useCallback((next: DebtInputs) => {
    setInputs(next);
    setDirty(true);
  }, []);

  // Enough to plan with: some income and at least one real debt.
  const canPlan = useMemo(
    () =>
      inputs.monthly_income > 0 &&
      inputs.debts.some((d) => d.balance > 0),
    [inputs],
  );

  const save = async () => {
    setSaving(true);
    try {
      await saveDebtInputs(inputs);
      setDirty(false);
      toast.success("Figures saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const buildPlan = async () => {
    if (!canPlan) {
      toast.error("Add your monthly income and at least one debt first");
      return;
    }
    setComputing(true);
    try {
      const next = await computePlan(inputs, currency);
      setPlan(next);
      // The brief describes the previous numbers — drop it so stale advice
      // never sits beside a fresh plan.
      setBrief("");
      // Persist quietly so the figures survive a reload.
      if (dirty) {
        saveDebtInputs(inputs)
          .then(() => setDirty(false))
          .catch(() => {});
      }
      if (!next.feasible) {
        toast.warning("These numbers don't add up to a payoff yet — see the plan");
      } else {
        toast.success(`Debt-free in ${next.months_to_freedom} months`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't build the plan");
    } finally {
      setComputing(false);
    }
  };

  const coach = async () => {
    setCoaching(true);
    try {
      const res = await fetchCoachBrief(inputs, currency, model);
      setPlan(res.plan);
      setBrief(res.brief);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Coaching is unavailable");
    } finally {
      setCoaching(false);
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 space-y-5 max-w-[1500px] mx-auto"
    >
      <motion.div
        variants={item}
        className="flex items-start justify-between gap-3 flex-wrap"
      >
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-primary" />
            Debt Rescue Mode
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter what you earn, owe and pay — get a survival budget, a payoff
            order, and a real debt-free date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[10px] font-mono text-amber">unsaved changes</span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={buildPlan}
            disabled={computing || !canPlan}
          >
            {computing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Calculator className="w-3.5 h-3.5" />
            )}
            Build Rescue Plan
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <motion.div
          variants={item}
          className="flex items-center justify-center gap-2 py-24 text-muted-foreground"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading your figures…</span>
        </motion.div>
      ) : (
        <motion.div
          variants={item}
          className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-5 items-start"
        >
          <DebtInputForm
            inputs={inputs}
            onChange={onInputsChange}
            disabled={computing || coaching}
          />

          {plan ? (
            <RescuePlan
              plan={plan}
              brief={brief}
              coaching={coaching}
              onCoach={coach}
              coachAvailable={coachAvailable}
            />
          ) : (
            <div className="glass-card p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[320px]">
              <LifeBuoy className="w-8 h-8 text-muted-foreground/40" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  No plan yet
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Fill in your income, fixed expenses and each debt, then build
                  the plan. Every figure is calculated from a month-by-month
                  simulation — nothing is estimated.
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5 mt-1"
                onClick={buildPlan}
                disabled={!canPlan || computing}
              >
                <Calculator className="w-3.5 h-3.5" /> Build Rescue Plan
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
