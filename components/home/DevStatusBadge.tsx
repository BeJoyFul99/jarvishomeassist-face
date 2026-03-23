"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

type BuildStatus = "success" | "failure" | "syncing";

const STATUS_CONFIG: Record<BuildStatus, {
  label: string;
  icon: typeof CheckCircle;
  color: string;
  glow: string;
  bg: string;
}> = {
  success: {
    label: "Build Passing",
    icon: CheckCircle,
    color: "text-emerald",
    glow: "0 0 16px hsl(152 69% 53% / 0.4)",
    bg: "bg-emerald/10",
  },
  failure: {
    label: "Fix Required",
    icon: AlertTriangle,
    color: "text-crimson",
    glow: "none",
    bg: "bg-crimson/10",
  },
  syncing: {
    label: "Deploying…",
    icon: Loader2,
    color: "text-cyan",
    glow: "none",
    bg: "bg-cyan/10",
  },
};

const DevStatusBadge = () => {
  const [status, setStatus] = useState<BuildStatus>("success");

  useEffect(() => {
    const cycle: BuildStatus[] = ["success", "syncing", "success", "failure", "syncing", "success"];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % cycle.length;
      setStatus(cycle[i]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div className="glass-card p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Git Sync</h3>
        <span className="text-[10px] font-mono text-muted-foreground">main</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`flex items-center gap-3 p-3 rounded-lg ${cfg.bg} border border-border`}
          style={{ boxShadow: cfg.glow }}
        >
          <motion.div
            animate={
              status === "success"
                ? { scale: [1, 1.15, 1] }
                : status === "syncing"
                  ? { rotate: 360 }
                  : {}
            }
            transition={
              status === "success"
                ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                : status === "syncing"
                  ? { duration: 1.2, repeat: Infinity, ease: "linear" }
                  : {}
            }
          >
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </motion.div>
          <div>
            <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {status === "success" && "Last commit 3m ago"}
              {status === "failure" && "Pipeline failed at test stage"}
              {status === "syncing" && "Pushing to production…"}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DevStatusBadge;
