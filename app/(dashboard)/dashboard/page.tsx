"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useFleet } from "@/hooks/useFleet";
import CpuMatrix from "@/components/dashboard/CpuMatrix";
import MemoryGauge from "@/components/dashboard/MemoryGauge";
import StorageHealth from "@/components/dashboard/StorageHealth";
import InferenceEngine from "@/components/dashboard/InferenceEngine";
import NetworkSecurity from "@/components/dashboard/NetworkSecurity";
import AgentFeed from "@/components/dashboard/AgentFeed";
import ClusterMap from "@/components/dashboard/ClusterMap";
import LiveFeed from "@/components/dashboard/LiveFeed";
import { Switch } from "@/components/ui/switch";
import { Wifi, Thermometer, Brain, Cpu, Laptop } from "lucide-react";
import type { SystemStatus } from "@/hooks/useSystemStatus";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};
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
  } = useFleet();

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
  const thermalDanger = activeNode.cpu.temp > 90;
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
            className="glass-card p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <Laptop className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    {activeNode.name}
                  </h2>
                  <span className="status-badge text-[10px] bg-emerald/10 text-emerald border border-emerald/20">
                    ONLINE
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {activeNode.cpu.model} ·{" "}
                  <span className="text-primary">{activeNode.tailscaleIp}</span>
                </p>
              </div>
            </div>

            {/* ✅ Right side: WiFi + Temp stacked — matches reference */}
            <div className="hidden md:flex items-center gap-8">
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
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
              <div className="h-8 w-px bg-border" />
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <Thermometer
                    className={`w-3.5 h-3.5 ${thermalDanger ? "text-crimson" : "text-amber"}`}
                  />
                  <span
                    className={`font-mono text-sm font-medium ${thermalDanger ? "text-crimson" : "text-foreground"}`}
                  >
                    {Math.round(activeNode.cpu.temp)}°C
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
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
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
            <StorageHealth
              systemGb={status.storage_system_gb}
              aiGb={status.storage_ai_gb}
              availableGb={status.storage_available_gb}
              totalGb={activeNode.storage.total}
            />
          </motion.div>

          {/* Inference Engine + Model Library */}
          <motion.div
            variants={item}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-2">
              <InferenceEngine status={status} />
            </div>
            <div className="glass-card-hover p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-magenta" />
                  <h3 className="text-sm font-medium text-foreground">
                    Model Library
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {activeNode.ai.models.length} models
                </span>
              </div>
              <div className="flex items-center justify-between mb-4 p-2.5 bg-secondary/50 rounded-lg">
                <span className="text-xs text-muted-foreground">Backend</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono ${activeNode.ai.backend === "cpu" ? "text-cyan" : "text-muted-foreground"}`}
                  >
                    CPU
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span
                    className={`text-[10px] font-mono ${activeNode.ai.backend === "gpu" ? "text-magenta" : "text-muted-foreground"}`}
                  >
                    GPU
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {activeNode.ai.models.map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono text-foreground truncate">
                        {model.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {model.size} · {model.quantization}
                      </div>
                    </div>
                    <button
                      className={`ml-2 px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors ${
                        activeNode.ai.model === model.name
                          ? "bg-magenta/10 text-magenta border border-magenta/20"
                          : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {activeNode.ai.model === model.name ? "Active" : "Load"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Network & Security + Cluster Map */}
          <motion.div
            variants={item}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-2">
              <NetworkSecurity status={status} />
            </div>
            <div className="space-y-4">
              <ClusterMap />
              <div className="glass-card-hover p-4 flex items-center justify-between">
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
