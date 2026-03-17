import { motion } from "framer-motion";
import { Cpu, Thermometer } from "lucide-react";
import type { HistoryPoint } from "@/hooks/useSystemStatus";

interface CpuMatrixProps {
  cpuUsage: number[];
  cpuTemp: number;
  history: HistoryPoint[];
}

const CpuMatrix = ({ cpuUsage, cpuTemp, history }: CpuMatrixProps) => {
  const thermalState =
    cpuTemp == -1
      ? "N/A"
      : cpuTemp > 95
        ? "Throttled"
        : cpuTemp > 80
          ? "Warning"
          : "Nominal";
  const thermalColor =
    cpuTemp == -1
      ? "text-gray-500 bg-gray-500/10"
      : cpuTemp > 95
        ? "text-crimson bg-crimson/10"
        : cpuTemp > 80
          ? "text-amber bg-amber/10"
          : "text-emerald bg-emerald/10";

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">CPU Matrix</h3>
        </div>
        <span className={`status-badge ${thermalColor}`}>
          <Thermometer className="w-3 h-3 inline mr-1" />
          {cpuTemp == -1 ? "N/A" : cpuTemp.toFixed(2)}°C · {thermalState}
        </span>
      </div>

      <div className="space-y-3">
        {cpuUsage.map((usage, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-mono">
                Core {i}
              </span>
              <span className="text-xs font-mono text-foreground">
                {usage?.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    usage > 80
                      ? "linear-gradient(90deg, hsl(var(--amber)), hsl(var(--crimson)))"
                      : "linear-gradient(90deg, hsl(var(--electric-blue)), hsl(var(--primary)))",
                }}
                animate={{ width: `${usage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mini sparkline */}
      <div className="mt-4 flex gap-1 items-end h-8">
        {history.slice(-20).map((point, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-sm bg-primary/40"
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(point.cpu, 5)}%` }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
};

export default CpuMatrix;
