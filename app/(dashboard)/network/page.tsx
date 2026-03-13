"use client";

import { motion } from "framer-motion";
import { Network, Shield, Clock, Globe, Activity, ArrowUpDown, Wifi } from "lucide-react";
import { useSystemStatus } from "@/hooks/useSystemStatus";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function NetworkPage() {
  const { status } = useSystemStatus();

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const interfaces = [
    { name: "en0", type: "Wi-Fi", ip: "192.168.1.42", status: "active", speed: "866 Mbps" },
    { name: "en1", type: "Thunderbolt", ip: "—", status: "inactive", speed: "—" },
    { name: "utun3", type: "Tailscale", ip: "100.64.0.12", status: "active", speed: "100 Mbps" },
    { name: "lo0", type: "Loopback", ip: "127.0.0.1", status: "active", speed: "—" },
  ];

  const bandwidth = {
    download: (Math.random() * 50 + 10).toFixed(1),
    upload: (Math.random() * 15 + 2).toFixed(1),
    latency: (Math.random() * 20 + 5).toFixed(0),
  };

  return (
    <div className="bg-background">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Network & Ports</h1>
            <p className="text-sm text-muted-foreground">Interface monitoring and port security</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-foreground">{status.wifi_signal.toFixed(0)} dBm</span>
          </div>
        </motion.div>

        {/* Bandwidth cards */}
        <motion.div variants={item} className="grid grid-cols-3 gap-3">
          {[
            { icon: ArrowUpDown, label: "Download", value: `${bandwidth.download} MB/s`, color: "text-emerald" },
            { icon: ArrowUpDown, label: "Upload", value: `${bandwidth.upload} MB/s`, color: "text-primary" },
            { icon: Activity, label: "Latency", value: `${bandwidth.latency} ms`, color: "text-amber" },
          ].map((m) => (
            <div key={m.label} className="glass-card-hover p-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <div className={`font-mono text-xl font-semibold ${m.color}`}>{m.value}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Network Interfaces */}
          <motion.div variants={item} className="glass-card-hover p-5">
            <div className="flex items-center gap-2 mb-4">
              <Network className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Network Interfaces</h3>
            </div>
            <div className="space-y-2">
              {interfaces.map((iface) => (
                <div key={iface.name} className="flex items-center justify-between py-2.5 px-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${iface.status === "active" ? "bg-emerald pulse-dot" : "bg-muted-foreground"}`} />
                    <div>
                      <span className="font-mono text-sm text-foreground">{iface.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{iface.type}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-foreground">{iface.ip}</div>
                    <div className="text-[10px] text-muted-foreground">{iface.speed}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Port Sentry */}
          <motion.div variants={item} className="glass-card-hover p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Port Sentry</h3>
            </div>
            <div className="space-y-2">
              {status.ports.map((p) => (
                <div key={p.port} className="flex items-center justify-between py-2.5 px-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${p.open ? "bg-emerald pulse-dot" : "bg-muted-foreground"}`} />
                    <span className="font-mono text-sm text-foreground">:{p.port}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{p.service}</span>
                    <span className={`status-badge text-[10px] ${p.open ? "bg-emerald/10 text-emerald" : "bg-secondary text-muted-foreground"}`}>
                      {p.open ? "LISTENING" : "CLOSED"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Active Connections */}
        <motion.div variants={item} className="glass-card-hover p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Active Connections</h3>
            <span className="ml-auto status-badge bg-secondary text-muted-foreground text-[10px]">
              {status.ssh_attempts.length} connections
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {status.ssh_attempts.map((attempt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between py-2.5 px-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${attempt.success ? "bg-emerald" : "bg-crimson"}`} />
                  <span className="font-mono text-sm text-foreground">{attempt.ip}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`status-badge text-[10px] ${attempt.success ? "bg-emerald/10 text-emerald" : "bg-crimson/10 text-crimson"}`}>
                    {attempt.success ? "ESTABLISHED" : "REJECTED"}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTime(attempt.timestamp)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
