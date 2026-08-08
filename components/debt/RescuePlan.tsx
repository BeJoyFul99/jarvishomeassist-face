"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  CalendarCheck,
  TrendingDown,
  Target,
  ShieldCheck,
  ListOrdered,
  Sparkles,
  Loader2,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { duration, monthLabel, type Plan } from "@/lib/debt";
import { formatMoney } from "@/lib/currency";

interface Props {
  plan: Plan;
  brief: string;
  coaching: boolean;
  onCoach: () => void;
  coachAvailable: boolean;
}

/** A headline figure. The number is the point — everything else is recessive. */
function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "text-primary",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone?: string;
}) {
  return (
    <div className="glass-card p-4 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${tone}`} />
        <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** One line of the survival budget: label, optional note, amount. */
function BudgetRow({
  label,
  amount,
  note,
  strong,
  tone,
  currency,
}: {
  label: string;
  amount: number;
  note?: string;
  strong?: boolean;
  tone?: string;
  currency: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p
          className={`text-xs truncate ${
            strong ? "text-foreground font-medium" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
      </div>
      <p
        className={`text-xs font-mono tabular-nums shrink-0 ${
          tone || (strong ? "text-foreground" : "text-muted-foreground")
        }`}
      >
        {formatMoney(amount, currency)}
      </p>
    </div>
  );
}

export function RescuePlan({
  plan,
  brief,
  coaching,
  onCoach,
  coachAvailable,
}: Props) {
  const s = plan.survival;
  const blocked = !plan.feasible;
  // Format with the currency the backend wrote its prose in, so the tiles
  // and plan.summary can never disagree.
  const cur = plan.currency;

  const chartData = plan.schedule.map((r) => ({
    month: r.month,
    date: r.date,
    balance: r.balance,
  }));

  return (
    <div className="space-y-4">
      {/* Headline — leads with the problem when the plan doesn't work. */}
      <div
        className={`glass-card p-5 ${
          blocked ? "border-destructive/40" : "border-emerald/30"
        }`}
      >
        <div className="flex items-start gap-3">
          {blocked ? (
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-foreground">
              {blocked ? "This plan doesn't close yet" : "Your recovery plan"}
            </h3>
            <p className="text-sm text-muted-foreground">{plan.summary}</p>
          </div>
        </div>
      </div>

      {/* The five headline outputs. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Monthly target"
          value={formatMoney(plan.monthly_payment_target, cur)}
          sub={`${formatMoney(s.minimum_payments, cur)} minimums + ${formatMoney(s.free_to_allocate, cur)} extra`}
          icon={Target}
        />
        <StatTile
          label="Debt-free date"
          value={plan.feasible ? monthLabel(plan.debt_free_date) : "—"}
          sub={plan.feasible ? duration(plan.months_to_freedom) : "not reachable yet"}
          icon={CalendarCheck}
          tone={blocked ? "text-destructive" : "text-emerald"}
        />
        <StatTile
          label="Interest saved"
          value={plan.interest_saved > 0 ? formatMoney(plan.interest_saved, cur) : "—"}
          sub={
            plan.baseline_capped
              ? "vs. minimums, which never clear"
              : plan.months_saved > 0
                ? `${duration(plan.months_saved)} sooner than minimums`
                : "vs. paying minimums only"
          }
          icon={TrendingDown}
          tone="text-cyan"
        />
        <StatTile
          label="Total debt"
          value={formatMoney(plan.total_debt, cur)}
          sub={`${formatMoney(plan.total_interest, cur)} interest under this plan`}
          icon={Scale}
          tone="text-magenta"
        />
      </div>

      {/* Anything that could invalidate the plan, stated plainly. */}
      {plan.warnings.length > 0 && (
        <div className="glass-card p-4 space-y-2 border-amber/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber" />
            <h3 className="text-sm font-medium text-foreground">Read this first</h3>
          </div>
          <ul className="space-y-1.5">
            {plan.warnings.map((w, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* 1. Emergency survival budget */}
        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center gap-2 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald" />
            <h3 className="text-sm font-medium text-foreground">
              Emergency Survival Budget
            </h3>
          </div>
          <BudgetRow currency={cur} label="Monthly income" amount={s.monthly_income} strong />
          <BudgetRow currency={cur}
            label="Fixed expenses"
            note="Rent, food, utilities, transport"
            amount={-s.fixed_expenses}
          />
          <BudgetRow currency={cur}
            label="Minimum debt payments"
            note="Non-negotiable — missing these adds fees"
            amount={-s.minimum_payments}
          />
          <BudgetRow currency={cur}
            label="Safety buffer"
            note="Held back so one surprise doesn't break the plan"
            amount={-s.safety_buffer}
          />
          <div className="border-t border-border my-1.5" />
          <BudgetRow currency={cur}
            label="Extra toward debt"
            amount={s.free_to_allocate}
            strong
            tone={s.free_to_allocate > 0 ? "text-emerald" : "text-destructive"}
          />
          {s.shortfall > 0 && (
            <BudgetRow currency={cur}
              label="Monthly shortfall"
              note="Income doesn't cover essentials — close this gap first"
              amount={s.shortfall}
              strong
              tone="text-destructive"
            />
          )}
          {(s.emergency_reserve > 0 || s.lump_sum_deployed > 0) && (
            <>
              <div className="border-t border-border my-1.5" />
              <BudgetRow currency={cur}
                label="Emergency reserve kept"
                note="One month of essentials, untouched"
                amount={s.emergency_reserve}
              />
              <BudgetRow currency={cur}
                label="Cash applied to debt now"
                amount={s.lump_sum_deployed}
                tone="text-cyan"
              />
            </>
          )}
        </div>

        {/* 2. Recommended repayment order */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">
                Repayment Order
              </h3>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground capitalize">
              {plan.strategy}
            </span>
          </div>

          {plan.order.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No debts entered — nothing to pay off.
            </p>
          ) : (
            <div className="space-y-2">
              {plan.order.map((d) => (
                <div
                  key={`${d.position}-${d.name}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-mono ${
                      d.position === 1
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {d.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {d.name}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {formatMoney(d.balance, cur)} · {d.apr}% · min {formatMoney(d.min_payment, cur)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {d.never_pays_off ? (
                      <p className="text-[10px] font-mono text-destructive">
                        never clears
                      </p>
                    ) : (
                      <>
                        <p className="text-[11px] font-mono text-foreground">
                          {monthLabel(d.payoff_date)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {d.payoff_month === 0
                            ? "cleared by cash"
                            : `month ${d.payoff_month}`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {plan.order.length > 1 && (
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {plan.strategy === "avalanche"
                ? "Highest interest rate first — every extra dollar kills the most expensive debt, so you pay the least overall."
                : "Smallest balance first — you clear a whole debt sooner, which is easier to stay motivated by even though it costs a little more."}{" "}
              As each debt clears, its payment rolls into the next one.
            </p>
          )}
        </div>
      </div>

      {/* Payoff curve — one series, so the title names it and no legend is needed. */}
      {chartData.length > 1 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              Total balance remaining
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="debtBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.3}
              />
              <XAxis
                dataKey="date"
                tickFormatter={monthLabel}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) => formatMoney(Number(v) || 0, cur)}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) => monthLabel(String(v))}
                formatter={(v) => [formatMoney(Number(v) || 0, cur), "Balance"]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                fill="url(#debtBalanceGrad)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Strategy comparison — the real cost of choosing motivation over maths. */}
      {plan.comparison.length > 1 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan" />
            <h3 className="text-sm font-medium text-foreground">
              Avalanche vs. Snowball
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {plan.comparison.map((c) => (
              <div
                key={c.strategy}
                className={`rounded-lg border p-3 space-y-1 ${
                  c.strategy === plan.strategy
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-secondary/30"
                }`}
              >
                <p className="text-xs font-medium text-foreground capitalize">
                  {c.strategy}
                  {c.strategy === plan.strategy && (
                    <span className="text-[10px] text-primary font-normal"> · selected</span>
                  )}
                </p>
                {c.converged ? (
                  <>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {monthLabel(c.debt_free_date)} · {duration(c.months)}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {formatMoney(c.total_interest, cur)} interest
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] font-mono text-destructive">
                    doesn&apos;t clear at this payment
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI coaching brief, written on top of the computed numbers. */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-magenta" />
            <h3 className="text-sm font-medium text-foreground">Coaching Brief</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={onCoach}
            disabled={coaching || !coachAvailable}
          >
            {coaching ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> Writing…
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" /> {brief ? "Regenerate" : "Get advice"}
              </>
            )}
          </Button>
        </div>
        {brief ? (
          <div className="space-y-2">
            {brief
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((para, i) => (
                <p
                  key={i}
                  className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap"
                >
                  {para}
                </p>
              ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {coachAvailable
              ? "Ask Jarvis to talk through this plan — what to do first, what to renegotiate, and how to hold the line. Every figure above is calculated, not guessed; the brief only explains them."
              : "The AI worker isn't configured, so coaching is unavailable. The plan above is fully calculated and usable on its own."}
          </p>
        )}
      </div>
    </div>
  );
}
