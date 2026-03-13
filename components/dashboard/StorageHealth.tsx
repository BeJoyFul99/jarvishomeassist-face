import { motion } from "framer-motion";
import { HardDrive } from "lucide-react";

interface StorageHealthProps {
  systemGb: number;
  aiGb: number;
  availableGb: number;
  totalGb: number;
}

const StorageHealth = ({ systemGb, aiGb, availableGb, totalGb }: StorageHealthProps) => {
  const sysPct = (systemGb / totalGb) * 100;
  const aiPct = (aiGb / totalGb) * 100;
  const availPct = (availableGb / totalGb) * 100;

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-center gap-2 mb-4">
        <HardDrive className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Storage Health</h3>
      </div>

      <div className="mb-3">
        <div className="h-4 bg-secondary rounded-full overflow-hidden flex">
          <motion.div
            className="h-full"
            style={{ background: "hsl(var(--electric-blue))" }}
            animate={{ width: `${sysPct}%` }}
            transition={{ duration: 1 }}
          />
          <motion.div
            className="h-full"
            style={{ background: "hsl(var(--amber))" }}
            animate={{ width: `${aiPct}%` }}
            transition={{ duration: 1, delay: 0.1 }}
          />
          <motion.div
            className="h-full"
            style={{ background: "hsl(var(--emerald) / 0.3)" }}
            animate={{ width: `${availPct}%` }}
            transition={{ duration: 1, delay: 0.2 }}
          />
        </div>
      </div>

      <div className="text-right mb-4">
        <span className="text-2xl font-mono font-semibold text-foreground">{totalGb}</span>
        <span className="text-sm text-muted-foreground ml-1">GB SSD</span>
      </div>

      <div className="space-y-2">
        {[
          { label: "System", value: systemGb, color: "bg-electric-blue" },
          { label: "AI Models", value: aiGb, color: "bg-amber" },
          { label: "Available", value: availableGb, color: "bg-emerald/30" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${color}`} /> {label}
            </span>
            <span className="font-mono text-foreground">{value} GB</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StorageHealth;
