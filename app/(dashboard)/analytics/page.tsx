"use client";

import { motion } from "framer-motion";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2">
      <p className="text-[10px] font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-mono" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { history } = useSystemStatus();

  const chartData = history
    .map((h, i) => ({
      time: `${i * 2}s ago`,
      cpu: h.cpu,
      temp: h.temp,
      ram: h.ram,
      network: Math.random() * 100,
    }))
    .reverse();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-4"
    >
      <motion.div variants={item}>
        <h1 className="text-xl font-semibold text-foreground">
          Historical Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System performance over time
        </p>
      </motion.div>

      {/* CPU Usage + Temperature */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <div className="glass-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            CPU Usage (%)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(210, 100%, 56%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(210, 100%, 56%)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 16%)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "hsl(0, 0%, 50%)" }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(0, 0%, 50%)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cpu"
                name="CPU"
                stroke="hsl(210, 100%, 56%)"
                fill="url(#cpuGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            CPU Temperature (°C)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 16%)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "hsl(0, 0%, 50%)" }}
              />
              <YAxis
                domain={[40, 100]}
                tick={{ fontSize: 10, fill: "hsl(0, 0%, 50%)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="temp"
                name="Temp"
                stroke="hsl(38, 92%, 50%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* RAM + Network */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <div className="glass-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Memory Usage (GB)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(152, 69%, 53%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(152, 69%, 53%)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 16%)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "hsl(0, 0%, 50%)" }}
              />
              <YAxis
                domain={[0, 16]}
                tick={{ fontSize: 10, fill: "hsl(0, 0%, 50%)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="ram"
                name="RAM"
                stroke="hsl(152, 69%, 53%)"
                fill="url(#ramGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Network Throughput (Mbps)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 16%)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "hsl(0, 0%, 50%)" }}
              />
              <YAxis tick={{ fontSize: 10, fill: "hsl(0, 0%, 50%)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="network"
                name="Throughput"
                fill="hsl(210, 100%, 56%)"
                radius={[4, 4, 0, 0]}
                opacity={0.7}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
