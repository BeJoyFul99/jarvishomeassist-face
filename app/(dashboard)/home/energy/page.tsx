"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Flame,
  Snowflake,
  Clock,
  CalendarDays,
  Loader2,
  Target,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

interface EnergyReading {
  id: number;
  timestamp: string;
  watt_hours: number;
  avg_watts: number;
  peak_watts: number;
  source: string;
}

interface EnergySummary {
  period: string;
  total_kwh: number;
  total_cost: number;
  avg_watts: number;
  peak_watts: number;
  reading_count: number;
  currency: string;
  budget_kwh: number;
  budget_amount: number;
  daily: { date: string; kwh: number; cost: number }[];
}

interface EnergyRate {
  id: number;
  name: string;
  price_per_kwh: number;
  currency: string;
  start_hour: number;
  end_hour: number;
  is_active: boolean;
}

const getHeatColor = (value: number) => {
  if (value < 100) return "hsl(var(--secondary))";
  if (value < 200) return "hsl(var(--emerald) / 0.3)";
  if (value < 350) return "hsl(var(--emerald) / 0.6)";
  if (value < 500) return "hsl(var(--amber) / 0.6)";
  if (value < 700) return "hsl(var(--volcano) / 0.6)";
  return "hsl(var(--volcano) / 0.9)";
};

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

export default function EnergyPage() {
  const [todayReadings, setTodayReadings] = useState<EnergyReading[]>([]);
  const [daySummary, setDaySummary] = useState<EnergySummary | null>(null);
  const [weekSummary, setWeekSummary] = useState<EnergySummary | null>(null);
  const [monthSummary, setMonthSummary] = useState<EnergySummary | null>(null);
  const [rates, setRates] = useState<EnergyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<"day" | "week" | "month">("day");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [todayRes, dayRes, weekRes, monthRes, ratesRes] = await Promise.all([
          fetch("/api/energy/today"),
          fetch("/api/energy/summary?period=day"),
          fetch("/api/energy/summary?period=week"),
          fetch("/api/energy/summary?period=month"),
          fetch("/api/energy/rates"),
        ]);

        if (todayRes.ok) setTodayReadings(await todayRes.json());
        if (dayRes.ok) setDaySummary(await dayRes.json());
        if (weekRes.ok) setWeekSummary(await weekRes.json());
        if (monthRes.ok) setMonthSummary(await monthRes.json());
        if (ratesRes.ok) setRates(await ratesRes.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const activeSummary =
    activePeriod === "day" ? daySummary : activePeriod === "week" ? weekSummary : monthSummary;

  const currency = activeSummary?.currency || "CAD";

  // Budget progress
  const budgetKWh = monthSummary?.budget_kwh || 0;
  const budgetAmount = monthSummary?.budget_amount || 0;
  const monthKWh = monthSummary?.total_kwh || 0;
  const monthCost = monthSummary?.total_cost || 0;
  const budgetKWhPct = budgetKWh > 0 ? Math.min((monthKWh / budgetKWh) * 100, 100) : 0;
  const budgetCostPct = budgetAmount > 0 ? Math.min((monthCost / budgetAmount) * 100, 100) : 0;

  // Find max for bar chart scaling
  const maxDailyKWh = Math.max(...(activeSummary?.daily?.map((d) => d.kwh) || [1]), 1);

  // Current rate
  const currentHour = new Date().getHours();
  const currentRate = rates.find((r) => r.is_active && currentHour >= r.start_hour && currentHour < r.end_hour);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex items-center justify-center gap-2 text-muted-foreground min-h-[300px]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading energy data...</span>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber" /> Energy Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your household energy usage and costs
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-mono text-muted-foreground">Today</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono">
            {daySummary?.total_kwh?.toFixed(1) || "0"} <span className="text-xs text-muted-foreground">kWh</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatCurrency(daySummary?.total_cost || 0, currency)}
          </p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-cyan">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-mono text-muted-foreground">Avg Power</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono">
            {daySummary?.avg_watts?.toFixed(0) || "0"} <span className="text-xs text-muted-foreground">W</span>
          </p>
          <p className="text-[10px] text-muted-foreground">average draw</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-crimson">
            <TrendingDown className="w-4 h-4" />
            <span className="text-[10px] font-mono text-muted-foreground">Peak</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono">
            {daySummary?.peak_watts?.toFixed(0) || "0"} <span className="text-xs text-muted-foreground">W</span>
          </p>
          <p className="text-[10px] text-muted-foreground">highest draw today</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-emerald">
            <DollarSign className="w-4 h-4" />
            <span className="text-[10px] font-mono text-muted-foreground">Rate Now</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono">
            {currentRate ? formatCurrency(currentRate.price_per_kwh, currency) : "—"} <span className="text-xs text-muted-foreground">/kWh</span>
          </p>
          <p className="text-[10px] text-muted-foreground">{currentRate?.name || "No rate set"}</p>
        </div>
      </motion.div>

      {/* Today's Hourly Heatmap */}
      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" /> Today&apos;s Hourly Usage
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground">
            {todayReadings.length} hours recorded
          </span>
        </div>

        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 24 }, (_, i) => {
            const reading = todayReadings.find(
              (r) => new Date(r.timestamp).getHours() === i
            );
            const watts = reading?.avg_watts || 0;
            const isCurrent = i === currentHour;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02, type: "spring", stiffness: 300, damping: 20 }}
                className={`relative group cursor-default rounded-sm ${
                  isCurrent ? "ring-1 ring-primary" : ""
                }`}
              >
                {/* Bar */}
                <div className="h-16 flex items-end">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: watts > 0 ? `${Math.max((watts / 900) * 100, 8)}%` : "4%",
                      backgroundColor: watts > 0 ? getHeatColor(watts) : "hsl(var(--secondary))",
                    }}
                  />
                </div>
                {/* Label */}
                <div className={`text-center text-[8px] font-mono mt-0.5 ${
                  isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                }`}>
                  {i % 3 === 0 ? `${String(i).padStart(2, "0")}` : ""}
                </div>
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block z-10
                    bg-popover border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground whitespace-nowrap shadow-lg">
                  {String(i).padStart(2, "0")}:00 — {Math.round(watts)}W ({reading ? `${(reading.watt_hours / 1000).toFixed(2)} kWh` : "no data"})
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 justify-center">
          <span className="text-[9px] text-muted-foreground">Low</span>
          {[80, 200, 350, 500, 700].map((v) => (
            <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getHeatColor(v) }} />
          ))}
          <span className="text-[9px] text-muted-foreground">High</span>
        </div>
      </motion.div>

      {/* Period Breakdown */}
      <motion.div variants={item} className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" /> Usage Breakdown
          </h2>
          <div className="flex gap-1 p-0.5 bg-secondary/50 rounded-lg">
            {(["day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activePeriod === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "day" ? "Today" : p === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activePeriod}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-lg font-semibold text-foreground font-mono">{activeSummary?.total_kwh?.toFixed(1) || "0"}</p>
                <p className="text-[10px] text-muted-foreground">kWh used</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-lg font-semibold text-foreground font-mono">{formatCurrency(activeSummary?.total_cost || 0, currency)}</p>
                <p className="text-[10px] text-muted-foreground">estimated cost</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-lg font-semibold text-foreground font-mono">{activeSummary?.peak_watts?.toFixed(0) || "0"}W</p>
                <p className="text-[10px] text-muted-foreground">peak draw</p>
              </div>
            </div>

            {/* Daily bar chart */}
            {activeSummary?.daily && activeSummary.daily.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Daily breakdown</p>
                <div className="space-y-1.5">
                  {[...activeSummary.daily]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((day) => {
                      const pct = (day.kwh / maxDailyKWh) * 100;
                      const dayLabel = new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });
                      return (
                        <div key={day.date} className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-muted-foreground w-24 shrink-0">{dayLabel}</span>
                          <div className="flex-1 h-5 bg-secondary/30 rounded-sm overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ type: "spring", stiffness: 200, damping: 20 }}
                              className="h-full rounded-sm"
                              style={{ backgroundColor: getHeatColor(day.kwh * 40) }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-foreground w-16 text-right">{day.kwh} kWh</span>
                          <span className="text-[10px] font-mono text-muted-foreground w-14 text-right">{formatCurrency(day.cost, currency)}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Budget + Rates */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Budget */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" /> Monthly Budget
          </h2>

          {budgetKWh > 0 ? (
            <div className="space-y-4">
              {/* kWh progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Energy used</span>
                  <span className="font-mono text-foreground">{monthKWh.toFixed(1)} / {budgetKWh} kWh</span>
                </div>
                <div className="h-3 bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetKWhPct}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={`h-full rounded-full ${
                      budgetKWhPct > 90 ? "bg-crimson" : budgetKWhPct > 70 ? "bg-amber" : "bg-emerald"
                    }`}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-right">{budgetKWhPct.toFixed(0)}% used</p>
              </div>

              {/* Cost progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-mono text-foreground">{formatCurrency(monthCost, currency)} / {formatCurrency(budgetAmount, currency)}</span>
                </div>
                <div className="h-3 bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetCostPct}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={`h-full rounded-full ${
                      budgetCostPct > 90 ? "bg-crimson" : budgetCostPct > 70 ? "bg-amber" : "bg-emerald"
                    }`}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-right">{budgetCostPct.toFixed(0)}% of budget</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No budget set. Admin can configure one.
            </div>
          )}
        </div>

        {/* Rate Schedule */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" /> Rate Schedule
          </h2>

          {rates.length > 0 ? (
            <div className="space-y-2">
              {/* Visual timeline */}
              <div className="flex h-6 rounded-lg overflow-hidden">
                {rates
                  .filter((r) => r.is_active)
                  .sort((a, b) => a.start_hour - b.start_hour)
                  .map((rate) => {
                    const span = rate.end_hour - rate.start_hour;
                    const pct = (span / 24) * 100;
                    const isCurrentRate = currentHour >= rate.start_hour && currentHour < rate.end_hour;
                    return (
                      <div
                        key={rate.id}
                        className={`relative group ${isCurrentRate ? "ring-1 ring-primary z-10" : ""}`}
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            rate.price_per_kwh < 0.1 ? "hsl(var(--emerald) / 0.3)" :
                            rate.price_per_kwh < 0.15 ? "hsl(var(--amber) / 0.3)" :
                            "hsl(var(--crimson) / 0.3)",
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[8px] font-mono text-foreground truncate px-1">{rate.name}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Rate list */}
              <div className="space-y-1.5 mt-3">
                {rates
                  .filter((r) => r.is_active)
                  .sort((a, b) => a.start_hour - b.start_hour)
                  .map((rate) => {
                    const isCurrentRate = currentHour >= rate.start_hour && currentHour < rate.end_hour;
                    return (
                      <div
                        key={rate.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                          isCurrentRate ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {rate.price_per_kwh >= 0.15 ? (
                            <Flame className="w-3.5 h-3.5 text-crimson" />
                          ) : rate.price_per_kwh >= 0.1 ? (
                            <Zap className="w-3.5 h-3.5 text-amber" />
                          ) : (
                            <Snowflake className="w-3.5 h-3.5 text-emerald" />
                          )}
                          <span className="text-foreground font-medium">{rate.name}</span>
                          {isCurrentRate && (
                            <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">NOW</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-foreground">{formatCurrency(rate.price_per_kwh, currency)}/kWh</span>
                          <span className="text-muted-foreground ml-2">
                            {String(rate.start_hour).padStart(2, "0")}:00–{String(rate.end_hour).padStart(2, "0")}:00
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No rates configured. Admin can set them up.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
