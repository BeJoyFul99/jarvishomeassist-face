import { motion } from "framer-motion";
import { Network, Shield, Clock } from "lucide-react";
import type { SystemStatus } from "@/hooks/useSystemStatus";

interface NetworkSecurityProps {
  status: SystemStatus;
}

const NetworkSecurity = ({ status }: NetworkSecurityProps) => {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Port Sentry */}
      <div className="glass-card-hover p-5">
        <div className="flex items-center gap-2 mb-4">
          <Network className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Port Sentry</h3>
        </div>
        <div className="space-y-2">
          {status.ports?.map((p) => (
            <div key={p.port} className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-lg">
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
      </div>

      {/* SSH Attempts */}
      <div className="glass-card-hover p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Active Connections</h3>
        </div>
        <div className="space-y-2">
          {status.ssh_attempts?.map((attempt, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-lg"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${attempt.success ? "bg-emerald" : "bg-crimson"}`} />
                <span className="font-mono text-sm text-foreground">{attempt.ip}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatTime(attempt.timestamp)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NetworkSecurity;
