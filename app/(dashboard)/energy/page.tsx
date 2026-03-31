"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  DollarSign,
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  RefreshCw,
  Clock,
  Target,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  CalendarDays,
  Flame,
  Snowflake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface EnergyRate {
  id: number;
  name: string;
  price_per_kwh: number;
  currency: string;
  start_hour: number;
  end_hour: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EnergyBudget {
  id?: number;
  month: number;
  year: number;
  budget_kwh: number;
  budget_amount: number;
  currency: string;
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

interface EnergyReading {
  id: number;
  timestamp: string;
  watt_hours: number;
  avg_watts: number;
  peak_watts: number;
  source: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

export default function EnergyManagementPage() {
  // Data
  const [rates, setRates] = useState<EnergyRate[]>([]);
  const [budget, setBudget] = useState<EnergyBudget | null>(null);
  const [summary, setSummary] = useState<EnergySummary | null>(null);
  const [todayReadings, setTodayReadings] = useState<EnergyReading[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab
  const [tab, setTab] = useState<"rates" | "budget" | "readings">("rates");

  // Rate dialog
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<EnergyRate | null>(null);
  const [rateForm, setRateForm] = useState({
    name: "",
    price_per_kwh: "",
    start_hour: "0",
    end_hour: "24",
    is_active: true,
  });
  const [rateSaving, setRateSaving] = useState(false);

  // Delete dialog
  const [deleteRateId, setDeleteRateId] = useState<number | null>(null);

  // Budget dialog
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    budget_kwh: "",
    budget_amount: "",
  });
  const [budgetSaving, setBudgetSaving] = useState(false);

  // Reading dialog
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);
  const [readingForm, setReadingForm] = useState({
    timestamp: "",
    watt_hours: "",
    avg_watts: "",
    peak_watts: "",
    source: "manual",
  });
  const [readingSaving, setReadingSaving] = useState(false);

  const authHeaders = useCallback(() => {
    return { "Content-Type": "application/json" };
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [ratesRes, budgetRes, summaryRes, todayRes] = await Promise.all([
        fetch("/api/energy/rates", { headers: authHeaders() }),
        fetch("/api/energy/budget", { headers: authHeaders() }),
        fetch("/api/energy/summary?period=month", { headers: authHeaders() }),
        fetch("/api/energy/today", { headers: authHeaders() }),
      ]);

      if (ratesRes.ok) {
        const data = await ratesRes.json();
        setRates(Array.isArray(data) ? data : []);
      }
      if (budgetRes.ok) setBudget(await budgetRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (todayRes.ok) {
        const data = await todayRes.json();
        setTodayReadings(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error("Failed to load energy data");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Rate CRUD ─────────────────────────────────────────────

  const openCreateRate = () => {
    setEditingRate(null);
    setRateForm({ name: "", price_per_kwh: "", start_hour: "0", end_hour: "24", is_active: true });
    setRateDialogOpen(true);
  };

  const openEditRate = (rate: EnergyRate) => {
    setEditingRate(rate);
    setRateForm({
      name: rate.name,
      price_per_kwh: String(rate.price_per_kwh),
      start_hour: String(rate.start_hour),
      end_hour: String(rate.end_hour),
      is_active: rate.is_active,
    });
    setRateDialogOpen(true);
  };

  const saveRate = async () => {
    if (!rateForm.name || !rateForm.price_per_kwh) {
      toast.error("Name and price are required");
      return;
    }
    setRateSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: rateForm.name,
        price_per_kwh: parseFloat(rateForm.price_per_kwh),
        start_hour: parseInt(rateForm.start_hour),
        end_hour: parseInt(rateForm.end_hour),
        is_active: rateForm.is_active,
      };
      if (editingRate) body.id = editingRate.id;

      const res = await fetch("/api/admin/energy/rates", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save rate");
      toast.success(editingRate ? "Rate updated" : "Rate created");
      setRateDialogOpen(false);
      fetchAll();
    } catch {
      toast.error("Failed to save rate");
    } finally {
      setRateSaving(false);
    }
  };

  const deleteRate = async () => {
    if (!deleteRateId) return;
    try {
      const res = await fetch(`/api/admin/energy/rates/${deleteRateId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete rate");
      toast.success("Rate deleted");
      setDeleteRateId(null);
      fetchAll();
    } catch {
      toast.error("Failed to delete rate");
    }
  };

  // ── Budget ────────────────────────────────────────────────

  const openBudgetDialog = () => {
    if (budget && budget.budget_kwh > 0) {
      setBudgetForm({
        month: String(budget.month),
        year: String(budget.year),
        budget_kwh: String(budget.budget_kwh),
        budget_amount: String(budget.budget_amount),
      });
    }
    setBudgetDialogOpen(true);
  };

  const saveBudget = async () => {
    if (!budgetForm.budget_kwh && !budgetForm.budget_amount) {
      toast.error("Set at least one budget value");
      return;
    }
    setBudgetSaving(true);
    try {
      const res = await fetch("/api/admin/energy/budget", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          month: parseInt(budgetForm.month),
          year: parseInt(budgetForm.year),
          budget_kwh: parseFloat(budgetForm.budget_kwh) || 0,
          budget_amount: parseFloat(budgetForm.budget_amount) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to save budget");
      toast.success("Budget saved");
      setBudgetDialogOpen(false);
      fetchAll();
    } catch {
      toast.error("Failed to save budget");
    } finally {
      setBudgetSaving(false);
    }
  };

  // ── Record Reading ────────────────────────────────────────

  const openRecordDialog = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setReadingForm({
      timestamp: local.toISOString().slice(0, 16),
      watt_hours: "",
      avg_watts: "",
      peak_watts: "",
      source: "manual",
    });
    setReadingDialogOpen(true);
  };

  const saveReading = async () => {
    if (!readingForm.watt_hours) {
      toast.error("Watt-hours is required");
      return;
    }
    setReadingSaving(true);
    try {
      const res = await fetch("/api/admin/energy", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          timestamp: readingForm.timestamp ? new Date(readingForm.timestamp).toISOString() : undefined,
          watt_hours: parseFloat(readingForm.watt_hours),
          avg_watts: parseFloat(readingForm.avg_watts) || 0,
          peak_watts: parseFloat(readingForm.peak_watts) || 0,
          source: readingForm.source,
        }),
      });
      if (!res.ok) throw new Error("Failed to record reading");
      toast.success("Reading recorded");
      setReadingDialogOpen(false);
      fetchAll();
    } catch {
      toast.error("Failed to record reading");
    } finally {
      setReadingSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────

  const currentHour = new Date().getHours();
  const currentRate = rates.find((r) => r.is_active && currentHour >= r.start_hour && currentHour < r.end_hour);
  const activeRates = rates.filter((r) => r.is_active).sort((a, b) => a.start_hour - b.start_hour);
  const inactiveRates = rates.filter((r) => !r.is_active);
  const currency = summary?.currency || budget?.currency || "CAD";

  const monthKWh = summary?.total_kwh || 0;
  const monthCost = summary?.total_cost || 0;
  const budgetKWh = summary?.budget_kwh || budget?.budget_kwh || 0;
  const budgetAmount = summary?.budget_amount || budget?.budget_amount || 0;
  const budgetKWhPct = budgetKWh > 0 ? Math.min((monthKWh / budgetKWh) * 100, 100) : 0;
  const budgetCostPct = budgetAmount > 0 ? Math.min((monthCost / budgetAmount) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex items-center justify-center gap-2 text-muted-foreground min-h-[300px]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading energy management...</span>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber" /> Energy Management
          </h1>
          <p className="text-sm text-muted-foreground">Manage rates, budgets, and energy readings</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAll(); }}
          className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Overview Cards */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber">
            <DollarSign className="w-4 h-4" />
            <span className="text-[10px] font-mono text-muted-foreground">Active Rates</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono">{activeRates.length}</p>
          <p className="text-[10px] text-muted-foreground">{inactiveRates.length} inactive</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-emerald">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-mono text-muted-foreground">Current Rate</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono">
            {currentRate ? formatCurrency(currentRate.price_per_kwh, currency) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">{currentRate?.name || "No rate"} /kWh</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-cyan">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-mono text-muted-foreground">This Month</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono">{monthKWh.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">kWh · {formatCurrency(monthCost, currency)}</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-crimson">
            <Target className="w-4 h-4" />
            <span className="text-[10px] font-mono text-muted-foreground">Budget Used</span>
          </div>
          <p className="text-xl font-semibold text-foreground font-mono">
            {budgetKWh > 0 ? `${budgetKWhPct.toFixed(0)}%` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {budgetKWh > 0 ? `${monthKWh.toFixed(1)} / ${budgetKWh} kWh` : "No budget set"}
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} className="flex gap-1 p-1 bg-secondary/40 backdrop-blur-md border border-white/5 rounded-xl w-full md:w-fit relative">
        {(["rates", "budget", "readings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative flex-1 md:flex-initial px-3 md:px-5 py-2 rounded-lg text-xs font-semibold transition-colors z-10 capitalize whitespace-nowrap",
              tab === t ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === t && (
              <motion.div
                layoutId="activeEnergyTab"
                className="absolute inset-0 bg-primary shadow-[0_0_15px_-5px_hsl(var(--primary)/0.4)] rounded-lg"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{t}</span>
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ── Rates Tab ──────────────────────────────────────── */}
        {tab === "rates" && (
          <motion.div
            key="rates"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Rate Timeline */}
            {activeRates.length > 0 && (
              <div className="glass-card p-5 space-y-3">
                <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" /> 24-Hour Rate Timeline
                </h2>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  {activeRates.map((rate) => {
                    const span = rate.end_hour - rate.start_hour;
                    const pct = (span / 24) * 100;
                    const isCurrent = currentHour >= rate.start_hour && currentHour < rate.end_hour;
                    return (
                      <div
                        key={rate.id}
                        className={`relative group cursor-pointer ${isCurrent ? "ring-2 ring-primary z-10" : ""}`}
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            rate.price_per_kwh < 0.1 ? "hsl(var(--emerald) / 0.3)" :
                            rate.price_per_kwh < 0.15 ? "hsl(var(--amber) / 0.3)" :
                            "hsl(var(--crimson) / 0.3)",
                        }}
                        onClick={() => openEditRate(rate)}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[9px] font-mono text-foreground truncate px-1">
                            {rate.name}
                          </span>
                        </div>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block z-20
                          bg-popover border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground whitespace-nowrap shadow-lg">
                          {rate.name}: {formatCurrency(rate.price_per_kwh, currency)}/kWh ({String(rate.start_hour).padStart(2, "0")}:00–{String(rate.end_hour).padStart(2, "0")}:00)
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </div>
            )}

            {/* Rate Cards */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">
                Rate Tiers ({rates.length})
              </h2>
              <button
                onClick={openCreateRate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_15px_-5px_hsl(var(--primary)/0.4)] whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> New Rate
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rates
                .sort((a, b) => a.start_hour - b.start_hour)
                .map((rate) => (
                  <motion.div
                    key={rate.id}
                    layout
                    className={`glass-card p-4 space-y-3 ${!rate.is_active ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {rate.price_per_kwh >= 0.15 ? (
                          <Flame className="w-4 h-4 text-crimson" />
                        ) : rate.price_per_kwh >= 0.1 ? (
                          <Zap className="w-4 h-4 text-amber" />
                        ) : (
                          <Snowflake className="w-4 h-4 text-emerald" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{rate.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {String(rate.start_hour).padStart(2, "0")}:00 – {String(rate.end_hour).padStart(2, "0")}:00
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {rate.is_active ? (
                          <ToggleRight className="w-4 h-4 text-emerald" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                        <button onClick={() => openEditRate(rate)} className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteRateId(rate.id)} className="p-1.5 rounded-md hover:bg-crimson/10 text-muted-foreground hover:text-crimson transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold text-foreground font-mono">
                        {formatCurrency(rate.price_per_kwh, currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">/kWh</span>
                    </div>

                    {currentHour >= rate.start_hour && currentHour < rate.end_hour && rate.is_active && (
                      <span className="inline-block text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                        ACTIVE NOW
                      </span>
                    )}
                  </motion.div>
                ))}
            </div>

            {rates.length === 0 && (
              <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                No rates configured. Add your first rate tier to start tracking energy costs.
              </div>
            )}
          </motion.div>
        )}

        {/* ── Budget Tab ─────────────────────────────────────── */}
        {tab === "budget" && (
          <motion.div
            key="budget"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" /> Monthly Budget
              </h2>
              <button
                onClick={openBudgetDialog}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_15px_-5px_hsl(var(--primary)/0.4)] whitespace-nowrap"
              >
                <Pencil className="w-3.5 h-3.5" /> {budgetKWh > 0 ? "Edit Budget" : "Set Budget"}
              </button>
            </div>

            {budgetKWh > 0 || budgetAmount > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Energy Budget Card */}
                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Energy Usage</h3>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {MONTHS[(budget?.month || new Date().getMonth() + 1) - 1]} {budget?.year || new Date().getFullYear()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Used</span>
                      <span className="font-mono text-foreground">{monthKWh.toFixed(1)} / {budgetKWh} kWh</span>
                    </div>
                    <div className="h-4 bg-secondary/30 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${budgetKWhPct}%` }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={`h-full rounded-full ${
                          budgetKWhPct > 90 ? "bg-crimson" : budgetKWhPct > 70 ? "bg-amber" : "bg-emerald"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className={`font-medium ${budgetKWhPct > 90 ? "text-crimson" : budgetKWhPct > 70 ? "text-amber" : "text-emerald"}`}>
                        {budgetKWhPct.toFixed(0)}% used
                      </span>
                      <span className="text-muted-foreground">{(budgetKWh - monthKWh).toFixed(1)} kWh remaining</span>
                    </div>
                  </div>
                </div>

                {/* Cost Budget Card */}
                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Cost Budget</h3>
                    <span className="text-[10px] font-mono text-muted-foreground">{currency}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Spent</span>
                      <span className="font-mono text-foreground">
                        {formatCurrency(monthCost, currency)} / {formatCurrency(budgetAmount, currency)}
                      </span>
                    </div>
                    <div className="h-4 bg-secondary/30 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${budgetCostPct}%` }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={`h-full rounded-full ${
                          budgetCostPct > 90 ? "bg-crimson" : budgetCostPct > 70 ? "bg-amber" : "bg-emerald"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className={`font-medium ${budgetCostPct > 90 ? "text-crimson" : budgetCostPct > 70 ? "text-amber" : "text-emerald"}`}>
                        {budgetCostPct.toFixed(0)}% of budget
                      </span>
                      <span className="text-muted-foreground">{formatCurrency(budgetAmount - monthCost, currency)} remaining</span>
                    </div>
                  </div>
                </div>

                {/* Daily breakdown */}
                {summary?.daily && summary.daily.length > 0 && (
                  <div className="glass-card p-5 space-y-3 md:col-span-2">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" /> Daily Breakdown
                    </h3>
                    <div className="space-y-1.5">
                      {[...summary.daily]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((day) => {
                          const maxKWh = Math.max(...summary.daily.map((d) => d.kwh), 1);
                          const pct = (day.kwh / maxKWh) * 100;
                          const dayLabel = new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric",
                          });
                          return (
                            <div key={day.date} className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-muted-foreground w-24 shrink-0">{dayLabel}</span>
                              <div className="flex-1 h-5 bg-secondary/30 rounded-sm overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                  className="h-full rounded-sm bg-primary/40"
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
              </div>
            ) : (
              <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                No budget configured for this month. Set a budget to track energy spending.
              </div>
            )}
          </motion.div>
        )}

        {/* ── Readings Tab ───────────────────────────────────── */}
        {tab === "readings" && (
          <motion.div
            key="readings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" /> Today&apos;s Readings ({todayReadings.length})
              </h2>
              <button
                onClick={openRecordDialog}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_15px_-5px_hsl(var(--primary)/0.4)] whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Record Reading
              </button>
            </div>

            {todayReadings.length > 0 ? (
              <div className="glass-card overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Watt-hours</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Avg Watts</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Peak Watts</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayReadings
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((reading) => {
                        const hour = new Date(reading.timestamp).getHours();
                        const isCurrent = hour === currentHour;
                        return (
                          <tr
                            key={reading.id}
                            className={`border-b border-border/50 ${isCurrent ? "bg-primary/5" : "hover:bg-secondary/30"}`}
                          >
                            <td className="p-3 font-mono text-foreground">
                              {String(hour).padStart(2, "0")}:00
                              {isCurrent && <span className="ml-2 text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">NOW</span>}
                            </td>
                            <td className="p-3 text-right font-mono text-foreground">{reading.watt_hours.toFixed(1)}</td>
                            <td className="p-3 text-right font-mono text-foreground">{reading.avg_watts.toFixed(1)}</td>
                            <td className="p-3 text-right font-mono text-foreground">{reading.peak_watts.toFixed(1)}</td>
                            <td className="p-3 text-right">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                reading.source === "manual" ? "bg-amber/10 text-amber" :
                                reading.source === "smart_meter" ? "bg-emerald/10 text-emerald" :
                                "bg-secondary text-muted-foreground"
                              }`}>
                                {reading.source}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="glass-card p-8 text-center text-sm text-muted-foreground">
                No readings recorded today. Add a manual reading or connect a smart meter.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rate Dialog ──────────────────────────────────────── */}
      <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {editingRate ? "Edit Rate" : "New Rate Tier"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Name</Label>
                <Input
                  value={rateForm.name}
                  onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                  placeholder="Peak"
                  className="h-8 text-sm bg-secondary/30 border-white/5"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Price / kWh</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={rateForm.price_per_kwh}
                  onChange={(e) => setRateForm({ ...rateForm, price_per_kwh: e.target.value })}
                  placeholder="0.12"
                  className="h-8 text-sm font-mono bg-secondary/30 border-white/5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Start (0-23)</Label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={rateForm.start_hour}
                  onChange={(e) => setRateForm({ ...rateForm, start_hour: e.target.value })}
                  className="h-8 text-sm font-mono bg-secondary/30 border-white/5"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">End (1-24)</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={rateForm.end_hour}
                  onChange={(e) => setRateForm({ ...rateForm, end_hour: e.target.value })}
                  className="h-8 text-sm font-mono bg-secondary/30 border-white/5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-white/5 mt-1">
              <span className="text-xs font-semibold text-foreground uppercase tracking-tight">Status</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{rateForm.is_active ? "Active" : "Inactive"}</span>
                <button
                  type="button"
                  onClick={() => setRateForm({ ...rateForm, is_active: !rateForm.is_active })}
                  className="transition-transform active:scale-95"
                >
                  {rateForm.is_active ? (
                    <ToggleRight className="w-5 h-5 text-emerald" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setRateDialogOpen(false)}
              className="px-4 py-2 text-sm rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveRate}
              disabled={rateSaving}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {rateSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingRate ? "Update" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Rate Dialog ───────────────────────────────── */}
      <AlertDialog open={deleteRateId !== null} onOpenChange={(open) => !open && setDeleteRateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rate tier? This cannot be undone. Cost calculations for past readings using this rate will no longer be accurate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Budget Dialog ────────────────────────────────────── */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4" /> Set Monthly Budget
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Month</Label>
                <Select value={budgetForm.month} onValueChange={(v) => setBudgetForm({ ...budgetForm, month: v })}>
                  <SelectTrigger className="h-8 bg-secondary/30 border-white/5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Year</Label>
                <Input
                  type="number"
                  value={budgetForm.year}
                  onChange={(e) => setBudgetForm({ ...budgetForm, year: e.target.value })}
                  className="h-8 text-sm font-mono bg-secondary/30 border-white/5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Budget (kWh)</Label>
                <Input
                  type="number"
                  value={budgetForm.budget_kwh}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budget_kwh: e.target.value })}
                  placeholder="500"
                  className="h-8 text-sm font-mono bg-secondary/30 border-white/5"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Budget ({currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={budgetForm.budget_amount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budget_amount: e.target.value })}
                  placeholder="60.00"
                  className="h-8 text-sm font-mono bg-secondary/30 border-white/5"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setBudgetDialogOpen(false)}
              className="px-4 py-2 text-sm rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveBudget}
              disabled={budgetSaving}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {budgetSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Budget
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Record Reading Dialog ────────────────────────────── */}
      <Dialog open={readingDialogOpen} onOpenChange={setReadingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4" /> Record Energy Reading
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Timestamp</Label>
                <Input
                  type="datetime-local"
                  value={readingForm.timestamp}
                  onChange={(e) => setReadingForm({ ...readingForm, timestamp: e.target.value })}
                  className="h-8 text-[11px] font-mono bg-secondary/30 border-white/5"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Source</Label>
                <Select value={readingForm.source} onValueChange={(v) => setReadingForm({ ...readingForm, source: v })}>
                  <SelectTrigger className="h-8 bg-secondary/30 border-white/5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="smart_meter">Smart Meter</SelectItem>
                    <SelectItem value="estimate">Estimate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Watt-hours (Wh) *</Label>
                <Input
                  type="number"
                  value={readingForm.watt_hours}
                  onChange={(e) => setReadingForm({ ...readingForm, watt_hours: e.target.value })}
                  placeholder="350"
                  className="h-8 text-sm font-mono bg-secondary/30 border-white/5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Avg Watts</Label>
                <Input
                  type="number"
                  value={readingForm.avg_watts}
                  onChange={(e) => setReadingForm({ ...readingForm, avg_watts: e.target.value })}
                  placeholder="Auto"
                  className="h-8 text-sm font-mono bg-secondary/30 border-white/5"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground/80 uppercase">Peak Watts</Label>
                <Input
                  type="number"
                  value={readingForm.peak_watts}
                  onChange={(e) => setReadingForm({ ...readingForm, peak_watts: e.target.value })}
                  placeholder="0"
                  className="h-8 text-sm font-mono bg-secondary/30 border-white/5"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setReadingDialogOpen(false)}
              className="px-4 py-2 text-sm rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveReading}
              disabled={readingSaving}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {readingSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Record
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
