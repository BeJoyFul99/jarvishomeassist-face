"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Zap,
  DollarSign,
  Activity,
  Eye,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  MessageSquare,
  Loader2,
  BarChart3,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import Link from "next/link";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const COST_PER_1K = 0.011;
const FREE_TIER_NEURONS = 10000;

interface TodayData {
  total_calls: number;
  total_neurons: number;
  total_cost: number;
  avg_latency_ms: number;
  error_count: number;
  vision_calls: number;
  alert?: string;
  alert_message?: string;
  error?: string;
}

interface DayRow {
  day: string;
  total_calls: number;
  total_neurons: number;
  total_cost: number;
  avg_latency_ms: number;
  total_input_tokens: number;
  total_output_tokens: number;
}

interface ModelRow {
  model: string;
  content_type: string;
  total_calls: number;
  total_neurons: number;
  total_cost: number;
  avg_latency_ms: number;
}

interface ErrorRow {
  timestamp: string;
  model: string;
  task: string;
  error_message: string;
  latency_ms: number;
}

export default function InferencePage() {
  const token = useAuthStore((s) => s.token);
  const [today, setToday] = useState<TodayData | null>(null);
  const [daily, setDaily] = useState<DayRow[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, summaryRes, modelRes, errorRes] = await Promise.all([
        fetch("/api/admin/ai-usage?endpoint=today", {
          headers: headers(),
          cache: "no-store",
        }),
        fetch(`/api/admin/ai-usage?endpoint=summary&days=${days}`, {
          headers: headers(),
          cache: "no-store",
        }),
        fetch(`/api/admin/ai-usage?endpoint=by-model&days=${days}`, {
          headers: headers(),
          cache: "no-store",
        }),
        fetch("/api/admin/ai-usage?endpoint=errors&days=1", {
          headers: headers(),
          cache: "no-store",
        }),
      ]);

      if (todayRes.ok) {
        const d = await todayRes.json();
        setToday({
          total_calls: num(d.total_calls),
          total_neurons: num(d.total_neurons),
          total_cost: num(d.total_cost),
          avg_latency_ms: num(d.avg_latency_ms),
          error_count: num(d.error_count),
          vision_calls: num(d.vision_calls),
          alert: d.alert,
          alert_message: d.alert_message,
          error: d.error,
        });
      }

      if (summaryRes.ok) {
        const d = await summaryRes.json();
        setDaily(
          (d.days || [])
            .map((r: Record<string, unknown>) => ({
              day: String(r.day || "").slice(0, 10),
              total_calls: num(r.total_calls),
              total_neurons: num(r.total_neurons),
              total_cost: num(r.total_cost),
              avg_latency_ms: num(r.avg_latency_ms),
              total_input_tokens: num(r.total_input_tokens),
              total_output_tokens: num(r.total_output_tokens),
            }))
            .reverse(),
        );
      }

      if (modelRes.ok) {
        const d = await modelRes.json();
        setModels(
          (d.models || []).map((r: Record<string, unknown>) => ({
            model: String(r.model || "unknown"),
            content_type: String(r.content_type || "text"),
            total_calls: num(r.total_calls),
            total_neurons: num(r.total_neurons),
            total_cost: num(r.total_cost),
            avg_latency_ms: num(r.avg_latency_ms),
          })),
        );
      }

      if (errorRes.ok) {
        const d = await errorRes.json();
        setErrors(
          (d.errors || []).slice(0, 10).map((r: Record<string, unknown>) => ({
            timestamp: String(r.timestamp || ""),
            model: String(r.model || ""),
            task: String(r.task || ""),
            error_message: String(r.error_message || r.error || ""),
            latency_ms: num(r.latency_ms),
          })),
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [headers, days]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const neuronPct = today
    ? Math.min((today.total_neurons / FREE_TIER_NEURONS) * 100, 100)
    : 0;
  const hasData = today && !today.error;

  return (
    <div className="bg-background">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="p-4 md:p-6 max-w-7xl mx-auto space-y-4"
      >
        {/* Header */}
        <motion.div
          variants={item}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                AI Inference
              </h1>
              <p className="text-sm text-muted-foreground">
                Cloudflare Workers AI usage tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-8 px-2 rounded-lg bg-secondary/50 border border-border/30 text-xs text-foreground focus:outline-none"
            >
              <option value={1}>24h</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </motion.div>

        {/* Alert banner */}
        {today?.alert && (
          <motion.div
            variants={item}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              today.alert === "critical"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{today.alert_message}</span>
          </motion.div>
        )}

        {/* Not configured banner */}
        {today?.error && (
          <motion.div
            variants={item}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border/30"
          >
            <Activity className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <span className="text-sm text-muted-foreground">
                Analytics Engine not configured yet. Set{" "}
                <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                  CF_ACCOUNT_ID
                </code>{" "}
                and{" "}
                <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                  CF_API_TOKEN
                </code>{" "}
                in your .env to see real usage data.
              </span>
            </div>
            <Link
              href="/chat"
              className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Open Chat
            </Link>
          </motion.div>
        )}

        {/* Top metrics */}
        <motion.div
          variants={item}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <MetricCard
            icon={Zap}
            label="Neurons Today"
            value={hasData ? formatNum(today!.total_neurons) : "—"}
            sub={
              hasData ? `${neuronPct.toFixed(0)}% of free tier` : "No data yet"
            }
            color="text-cyan"
            loading={loading}
          />
          <MetricCard
            icon={DollarSign}
            label="Cost Today"
            value={hasData ? `$${today!.total_cost.toFixed(4)}` : "—"}
            sub={hasData ? `${today!.total_calls} calls` : "No data yet"}
            color="text-emerald"
            loading={loading}
          />
          <MetricCard
            icon={Activity}
            label="Avg Latency"
            value={hasData ? `${today!.avg_latency_ms.toFixed(0)}ms` : "—"}
            sub={
              hasData && today!.error_count > 0
                ? `${today!.error_count} errors`
                : "All OK"
            }
            color="text-primary"
            loading={loading}
          />
          <MetricCard
            icon={Eye}
            label="Vision Calls"
            value={hasData ? String(today!.vision_calls) : "—"}
            sub="Image analysis"
            color="text-amber"
            loading={loading}
          />
        </motion.div>

        {/* Free tier progress */}
        {hasData && (
          <motion.div variants={item} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Free Tier Budget
              </span>
              <span className="text-xs font-mono text-foreground">
                {formatNum(today!.total_neurons)} /{" "}
                {formatNum(FREE_TIER_NEURONS)} neurons
              </span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  neuronPct >= 90
                    ? "bg-red-500"
                    : neuronPct >= 70
                      ? "bg-amber-500"
                      : "bg-cyan-500"
                }`}
                animate={{ width: `${neuronPct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground/60">
                Est. cost: $
                {((today!.total_neurons / 1000) * COST_PER_1K).toFixed(4)}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                {formatNum(
                  Math.max(0, FREE_TIER_NEURONS - today!.total_neurons),
                )}{" "}
                remaining
              </span>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Daily usage chart */}
          <motion.div variants={item} className="lg:col-span-2 glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Daily Usage
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" /> Neurons
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cost
                </span>
              </div>
            </div>
            {daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient id="neuronGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--cyan))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--cyan))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.3}
                  />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(v) => v.slice(5)}
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(v) => `Date: ${v}`}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, name: any) => {
                      const val = Number(v) || 0;
                      if (name === "total_cost")
                        return [`$${val.toFixed(4)}`, "Cost"];
                      if (name === "total_neurons")
                        return [formatNum(val), "Neurons"];
                      return [v, name];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_neurons"
                    stroke="hsl(var(--cyan))"
                    fill="url(#neuronGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-55 text-sm text-muted-foreground">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "No usage data yet"
                )}
              </div>
            )}
          </motion.div>

          {/* Side panel */}
          <motion.div variants={item} className="space-y-4">
            {/* Model breakdown */}
            <div className="glass-card p-4">
              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Usage by Model
              </div>
              {models.length > 0 ? (
                <div className="space-y-3">
                  {models.map((m, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono text-foreground truncate max-w-[65%]">
                          {m.model.split("/").pop()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {m.total_calls} calls
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${m.content_type === "vision" ? "bg-amber-500" : "bg-cyan-500"}`}
                            style={{
                              width: `${models[0]?.total_neurons > 0 ? (m.total_neurons / models[0].total_neurons) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">
                          {formatNum(m.total_neurons)}n
                        </span>
                      </div>
                      {m.content_type === "vision" && (
                        <span className="text-[9px] text-amber-400 mt-0.5 inline-block">
                          vision
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No model data
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className="glass-card p-4">
              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Cost Projection
              </div>
              {daily.length > 1 ? (
                <div className="space-y-2.5">
                  {(() => {
                    const totalCost = daily.reduce(
                      (s, d) => s + d.total_cost,
                      0,
                    );
                    const totalNeurons = daily.reduce(
                      (s, d) => s + d.total_neurons,
                      0,
                    );
                    const avgDaily = totalCost / daily.length;
                    const avgNeurons = totalNeurons / daily.length;
                    return [
                      ["Avg daily cost", `$${avgDaily.toFixed(4)}`],
                      ["Avg daily neurons", formatNum(avgNeurons)],
                      ["Projected /month", `$${(avgDaily * 30).toFixed(3)}`],
                      [`Total (${days}d)`, `$${totalCost.toFixed(4)}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-mono text-foreground">{v}</span>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Need 2+ days of data
                </p>
              )}
            </div>

            {/* Chat link */}
            <Link
              href="/chat"
              className="glass-card-hover p-4 flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block">
                  Open Jarvis Chat
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Talk to AI assistant
                </span>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Recent errors */}
        {errors.length > 0 && (
          <motion.div variants={item} className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-foreground">
                Recent Errors (24h)
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {errors.length} errors
              </span>
            </div>
            <div className="divide-y divide-border/20">
              {errors.map((err, i) => (
                <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5 w-14">
                    {new Date(err.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-red-400 block truncate">
                      {err.error_message}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {err.task} · {err.latency_ms.toFixed(0)}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="glass-card-hover p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-mono text-lg font-semibold text-foreground truncate">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          value
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
