import { motion } from "framer-motion";
import { Wifi, Shield, RotateCcw, Moon, Trash2, Bell } from "lucide-react";
import type { SystemStatus } from "@/hooks/useSystemStatus";

interface TopNavProps {
  status: SystemStatus;
}

function getSignalQuality(dbm: number) {
  if (dbm > -50) return { label: "Excellent", color: "text-emerald" };
  if (dbm > -60) return { label: "Good", color: "text-emerald" };
  if (dbm > -70) return { label: "Fair", color: "text-amber" };
  return { label: "Weak", color: "text-crimson" };
}

const TopNav = ({ status }: TopNavProps) => {
  const signal = getSignalQuality(status.wifi_signal);
  const alertActive = status.cpu_temp > 90;

  return (
    <div className="glass-card px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      {/* Left: Connectivity */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Wifi className={`w-4 h-4 ${signal.color}`} />
          <span className="font-mono text-xs text-muted-foreground">
            {Math.round(status.wifi_signal)} dBm
          </span>
          <span className={`status-badge bg-secondary ${signal.color}`}>
            {signal.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald" />
          <span className="status-badge bg-emerald/10 text-emerald">
            Tailscale · Connected
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Reboot"
        >
          <RotateCcw className="w-4 h-4" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Sleep AI"
        >
          <Moon className="w-4 h-4" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Clear Cache"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className={`p-2 rounded-lg transition-colors relative ${alertActive ? "text-crimson" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
          title="Alerts"
        >
          <Bell className="w-4 h-4" />
          {alertActive && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-crimson pulse-dot" />
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default TopNav;
