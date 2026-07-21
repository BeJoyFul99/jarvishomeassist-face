"use client";

import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUpItem } from "@/lib/motion";
import { useFleet } from "@/hooks/useFleet";
import CpuMatrix from "@/components/dashboard/CpuMatrix";
import MemoryGauge from "@/components/dashboard/MemoryGauge";
import StorageHealth from "@/components/dashboard/StorageHealth";
import InferenceEngine from "@/components/dashboard/InferenceEngine";
import NetworkSecurity from "@/components/dashboard/NetworkSecurity";
import AgentFeed from "@/components/dashboard/AgentFeed";
import ClusterMap from "@/components/dashboard/ClusterMap";
import LiveFeed from "@/components/dashboard/LiveFeed";
import ModelLibrary from "@/components/dashboard/ModelLibrary";
import { Switch } from "@/components/ui/switch";
import { Wifi, Thermometer, Laptop, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { SystemStatus } from "@/hooks/useSystemStatus";

const container = staggerContainer(0.06);
const item = fadeUpItem;
// ✅ Returns {label, color} — was incorrectly returning a plain string
function getSignalQuality(dbm: number) {
  if (dbm > -40) return { label: "Ultra Stable", color: "text-cyan" };
  if (dbm > -50) return { label: "Excellent", color: "text-emerald" };
  if (dbm > -60) return { label: "Good", color: "text-emerald" };
  if (dbm > -70) return { label: "Fair", color: "text-amber" };
  return { label: "Weak", color: "text-crimson" };
}
export default function DashboardPage() {
  const {
    activeNode,
    activeNodeId,
    loadBalancerEnabled,
    setLoadBalancerEnabled,
    isInitialLoad,
    isApiError,
  } = useFleet();

  if (isInitialLoad) {
    return (
      <div className="bg-background max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-24 w-full rounded-xl glass-card opacity-50" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-72 w-full rounded-xl glass-card opacity-50" />
          <Skeleton className="h-72 w-full rounded-xl glass-card opacity-50" />
          <Skeleton className="h-72 w-full rounded-xl glass-card opacity-50 md:col-span-2 lg:col-span-1" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-96 lg:col-span-2 w-full rounded-xl glass-card opacity-50" />
          <Skeleton className="h-96 w-full rounded-xl glass-card opacity-50" />
        </div>
      </div>
    );
  }

  if (isApiError && activeNodeId === "node-01") {
    return (
      <div className="bg-background max-w-7xl mx-auto space-y-4">
        <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-xl min-h-[60vh] border-crimson/20 bg-crimson/5">
           <div className="w-16 h-16 rounded-full bg-crimson/10 flex items-center justify-center mb-6">
             <AlertTriangle className="w-8 h-8 text-crimson" />
           </div>
           <h2 className="text-2xl font-semibold text-foreground mb-2">Node Unavailable</h2>
           <p className="text-muted-foreground max-w-md">
             Cannot connect to the Go backend for {activeNode.name}. Ensure the Docker container is running and port {activeNode.port ?? "5000"} is accessible.
           </p>
        </div>
      </div>
    );
  }

  // Convert FleetNode to SystemStatus-compatible shape for existing components
  const status: SystemStatus = {
    cpu_temp: activeNode.cpu.temp,
    cpu_usage: activeNode.cpu.usage,
    wifi_signal: activeNode.network.wifiSignal,
    ai_status: activeNode.ai.status,
    ram_used_gb: activeNode.ram.used,
    ram_wired_gb: activeNode.ram.wired,
    storage_system_gb: activeNode.storage.system,
    storage_ai_gb: activeNode.storage.ai,
    storage_available_gb: activeNode.storage.available,
    tps: activeNode.ai.tps,
    context_used: activeNode.ai.contextUsed,
    context_max: activeNode.ai.contextMax,
    active_model: activeNode.ai.model,
    ports: activeNode.network.ports,
    ssh_attempts: activeNode.network.sshAttempts,
    logs: activeNode.logs,
  };
  const thermalDanger = activeNode.cpu.temp !== -1 && activeNode.cpu.temp > 90;
  const signal = getSignalQuality(activeNode.network.wifiSignal);
  return (
    <div className="bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeNodeId}
          variants={container}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, x: -20 }}
          className="max-w-7xl mx-auto space-y-4"
        >
          {/* ✅ Node Identity Banner — matches reference design */}
          <motion.div
            variants={item}
            className="glass-card p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                <Laptop className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-foreground">
                    {activeNode.name}
                  </h2>
                  <span className="status-badge text-[10px] bg-emerald/10 text-emerald border border-emerald/20">
                    ONLINE
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-mono truncate">
                  {activeNode.cpu.model} ·{" "}
                  <span className="text-primary">{activeNode.tailscaleIp}</span>
                </p>
              </div>
            </div>

            {/* ✅ Right side: WiFi + Temp stacked — matches reference */}
            <div className="flex items-center justify-between gap-6 sm:justify-end sm:gap-8">
              <div className="sm:text-right">
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <Wifi className={`w-3.5 h-3.5 ${signal.color}`} />
                  <span
                    className={`font-mono text-sm font-medium ${signal.color}`}
                  >
                    {Math.round(activeNode.network.wifiSignal)} dBm
                  </span>
                </div>
                <span className={`text-[10px] ${signal.color}`}>
                  {signal.label}
                </span>
              </div>
              <div className="hidden sm:block h-8 w-px bg-border" />
              <div className="sm:text-right">
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <Thermometer
                    className={`w-3.5 h-3.5 ${thermalDanger ? "text-crimson" : "text-amber"}`}
                  />
                  <span
                    className={`font-mono text-sm font-medium ${thermalDanger ? "text-crimson" : "text-foreground"}`}
                  >
                    {activeNode.cpu.temp === -1 ? "N/A" : Math.round(activeNode.cpu.temp)}°C
                  </span>
                </div>
                <span
                  className={`text-[10px] ${thermalDanger ? "text-crimson" : "text-muted-foreground"}`}
                >
                  {thermalDanger ? "Critical" : "Nominal"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Vitals Grid */}
          <motion.div
            variants={item}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <CpuMatrix
              cpuUsage={status.cpu_usage}
              cpuTemp={status.cpu_temp}
              history={[]}
            />
            <MemoryGauge
              usedGb={status.ram_used_gb}
              wiredGb={status.ram_wired_gb}
              totalGb={activeNode.ram.total}
            />
            <div className="md:col-span-2 lg:col-span-1">
              <StorageHealth
                systemGb={status.storage_system_gb}
                aiGb={status.storage_ai_gb}
                availableGb={status.storage_available_gb}
                totalGb={activeNode.storage.total}
              />
            </div>
          </motion.div>

          {/* Inference Engine + Model Library */}
          <motion.div
            variants={item}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-2">
              <InferenceEngine status={status} />
            </div>
            <ModelLibrary />
          </motion.div>

          {/* Network & Security + Cluster Map */}
          <motion.div
            variants={item}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-2">
              <NetworkSecurity status={status} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              <ClusterMap />
              <div className="glass-card-hover p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Load Balancer
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Route traffic across nodes
                  </div>
                </div>
                <Switch
                  checked={loadBalancerEnabled}
                  onCheckedChange={setLoadBalancerEnabled}
                />
              </div>
            </div>
          </motion.div>

          <motion.div variants={item}>
            <AgentFeed />
          </motion.div>

          <motion.div variants={item}>
            <LiveFeed logs={status.logs} />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
