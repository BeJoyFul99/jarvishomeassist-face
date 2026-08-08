"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  Receipt,
  PiggyBank,
  Plus,
  Trash2,
  CreditCard,
  Target,
} from "lucide-react";
import {
  emptyDebt,
  type DebtInputs,
  type DebtEntry,
  type Strategy,
} from "@/lib/debt";
import { formatMoney, currencySymbol } from "@/lib/currency";
import { useCurrency } from "@/store/usePreferencesStore";

interface Props {
  inputs: DebtInputs;
  onChange: (next: DebtInputs) => void;
  disabled?: boolean;
}

/** Numeric field that stays editable while empty rather than snapping to 0. */
function MoneyField({
  label,
  hint,
  value,
  onChange,
  disabled,
  prefix,
  step = "1",
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  prefix?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {prefix}
        </span>
        <Input
          type="number"
          min="0"
          step={step}
          inputMode="decimal"
          disabled={disabled}
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) && n >= 0 ? n : 0);
          }}
          // The adornment is absolutely positioned, so the padding has to
          // clear it. A one-character "$" fits in pl-6; "RM" does not and
          // the value renders on top of it.
          className={`h-9 text-sm font-mono ${
            (prefix?.length ?? 0) > 1 ? "pl-11" : "pl-6"
          }`}
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DebtInputForm({ inputs, onChange, disabled }: Props) {
  const currency = useCurrency();
  const sym = currencySymbol(currency);
  const set = <K extends keyof DebtInputs>(key: K, value: DebtInputs[K]) =>
    onChange({ ...inputs, [key]: value });

  const setDebt = (i: number, patch: Partial<DebtEntry>) =>
    onChange({
      ...inputs,
      debts: inputs.debts.map((d, idx) => (idx === i ? { ...d, ...patch } : d)),
    });

  const addDebt = () =>
    onChange({ ...inputs, debts: [...inputs.debts, emptyDebt()] });

  const removeDebt = (i: number) =>
    onChange({ ...inputs, debts: inputs.debts.filter((_, idx) => idx !== i) });

  const totalDebt = inputs.debts.reduce((s, d) => s + (d.balance || 0), 0);
  const totalMinimums = inputs.debts.reduce((s, d) => s + (d.min_payment || 0), 0);
  const disposable = inputs.monthly_income - inputs.fixed_expenses;

  return (
    <div className="space-y-4">
      {/* Income & expenses */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Monthly Cash Flow</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MoneyField prefix={sym}
            label="Monthly income"
            hint="Take-home, after tax"
            value={inputs.monthly_income}
            onChange={(v) => set("monthly_income", v)}
            disabled={disabled}
          />
          <MoneyField prefix={sym}
            label="Fixed expenses"
            hint="Rent, food, utilities, transport"
            value={inputs.fixed_expenses}
            onChange={(v) => set("fixed_expenses", v)}
            disabled={disabled}
          />
          <MoneyField prefix={sym}
            label="Available cash"
            hint="Savings you could deploy today"
            value={inputs.available_cash}
            onChange={(v) => set("available_cash", v)}
            disabled={disabled}
          />
        </div>
        {inputs.monthly_income > 0 && (
          <p
            className={`text-[11px] font-mono ${
              disposable < totalMinimums ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {formatMoney(disposable, currency)}/month left after fixed expenses
            {totalMinimums > 0 && ` · ${formatMoney(totalMinimums, currency)} of minimums due`}
          </p>
        )}
      </div>

      {/* Debts */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-magenta" />
            <h3 className="text-sm font-medium text-foreground">Your Debts</h3>
          </div>
          {totalDebt > 0 && (
            <span className="text-[11px] font-mono text-muted-foreground">
              {formatMoney(totalDebt, currency)} total
            </span>
          )}
        </div>

        {inputs.debts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add each loan or card you owe — balance, interest rate, and the
            minimum payment. The plan is only as good as these numbers.
          </p>
        ) : (
          <div className="space-y-3">
            {inputs.debts.map((d, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={d.name}
                    disabled={disabled}
                    placeholder={`Debt ${i + 1} — e.g. Visa card`}
                    onChange={(e) => setDebt(i, { name: e.target.value })}
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => removeDebt(i)}
                    aria-label={`Remove ${d.name || `debt ${i + 1}`}`}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MoneyField prefix={sym}
                    label="Balance"
                    value={d.balance}
                    onChange={(v) => setDebt(i, { balance: v })}
                    disabled={disabled}
                  />
                  <MoneyField
                    label="Interest rate"
                    value={d.apr}
                    onChange={(v) => setDebt(i, { apr: v })}
                    disabled={disabled}
                    prefix="%"
                    step="0.01"
                  />
                  <MoneyField prefix={sym}
                    label="Min. payment"
                    value={d.min_payment}
                    onChange={(v) => setDebt(i, { min_payment: v })}
                    disabled={disabled}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={addDebt}
          disabled={disabled}
        >
          <Plus className="w-3.5 h-3.5" /> Add a debt
        </Button>
      </div>

      {/* Strategy */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan" />
          <h3 className="text-sm font-medium text-foreground">Payoff Strategy</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Order debts by</Label>
            <Select
              value={inputs.strategy}
              disabled={disabled}
              onValueChange={(v) => set("strategy", v as Strategy)}
            >
              <SelectTrigger className="h-9 text-xs bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avalanche" className="text-xs">
                  Avalanche — highest rate first
                </SelectItem>
                <SelectItem value="snowball" className="text-xs">
                  Snowball — smallest balance first
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {inputs.strategy === "avalanche"
                ? "Costs the least in total interest."
                : "Clears a debt sooner — easier to stick with."}
            </p>
          </div>
          <MoneyField prefix={sym}
            label="Monthly payment override"
            hint="Leave blank to use the safe amount we calculate"
            value={inputs.payment_override}
            onChange={(v) => set("payment_override", v)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 p-3">
        <PiggyBank className="w-3.5 h-3.5 text-emerald mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          One month of essentials is always held back as an emergency reserve
          before any spare cash goes toward a debt — draining your last dollar
          into a loan is how people end up back on a credit card next month.
        </p>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Receipt className="w-3 h-3 shrink-0" />
        <span>
          Figures are estimates based on what you enter. This is a planning
          tool, not regulated financial advice.
        </span>
      </div>
    </div>
  );
}
