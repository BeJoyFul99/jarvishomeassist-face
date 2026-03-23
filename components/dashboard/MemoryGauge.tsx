import { motion } from "framer-motion";
import { MemoryStick } from "lucide-react";
import { formatStorage, getStorageParts } from "@/lib/utils";

interface MemoryGaugeProps {
  usedGb: number;
  wiredGb: number;
  totalGb: number;
}

const MemoryGauge = ({ usedGb, wiredGb, totalGb }: MemoryGaugeProps) => {
  const usedPct = totalGb > 0 ? (usedGb / totalGb) * 100 : 0;
  const wiredPct = totalGb > 0 ? (wiredGb / totalGb) * 100 : 0;
  const pressure =
    usedPct > 85 ? "Critical" : usedPct > 70 ? "Warning" : "Normal";
  const pressureColor =
    usedPct > 85
      ? "text-crimson"
      : usedPct > 70
        ? "text-amber"
        : "text-emerald";

  // SVG gauge
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const usedDash = (usedPct / 100) * circumference;
  const wiredDash = (wiredPct / 100) * circumference;

  const usedParts = getStorageParts(usedGb);
  const totalParts = getStorageParts(totalGb);

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-center gap-2 mb-4">
        <MemoryStick className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Memory Pressure</h3>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative">
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            className="-rotate-90"
          >
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="8"
            />
            <motion.circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="hsl(var(--electric-blue))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - usedDash }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            {/* <motion.circle
              cx="70" cy="70" r={radius - 12} fill="none"
              stroke="hsl(var(--amber))"
              strokeWidth="4" strokeLinecap="round" opacity={0.6}
              strokeDasharray={circumference * ((radius - 12) / radius)}
              animate={{ strokeDashoffset: circumference * ((radius - 12) / radius) - wiredDash * ((radius - 12) / radius) }}
              transition={{ duration: 1, ease: "easeOut" }}
            /> */}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-mono font-semibold text-foreground">
              {usedParts.value}
            </span>
            <span className="text-xs text-muted-foreground">
              / {totalParts.value} {totalParts.unit}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-electric-blue" /> App
            Memory
          </span>
          <span className="font-mono text-foreground">
            {formatStorage(usedGb - wiredGb)}
          </span>
        </div>
        {/* <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber" /> Wired
          </span>
          <span className="font-mono text-foreground">{wiredGb.toFixed(1)} GB</span>
        </div> */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Pressure</span>
          <span className={`font-mono font-medium ${pressureColor}`}>
            {pressure}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MemoryGauge;
