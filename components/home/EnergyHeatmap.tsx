"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Loader2 } from "lucide-react";

interface EnergyReading {
  id: number;
  timestamp: string;
  watt_hours: number;
  avg_watts: number;
  peak_watts: number;
  source: string;
}

const getHeatColor = (value: number) => {
  if (value < 15) return "hsl(var(--secondary))";
  if (value < 30) return "hsl(var(--emerald) / 0.3)";
  if (value < 50) return "hsl(var(--emerald) / 0.6)";
  if (value < 70) return "hsl(var(--amber) / 0.6)";
  if (value < 85) return "hsl(var(--volcano) / 0.6)";
  return "hsl(var(--volcano) / 0.9)";
};

const EnergyHeatmap = () => {
  const [heatData, setHeatData] = useState<number[]>(Array(24).fill(0));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToday = async () => {
      try {
        const res = await fetch("/api/energy/today", {
          credentials: "include",
        });
        if (!res.ok) return;
        const readings: EnergyReading[] = await res.json();
        const hourly = Array(24).fill(0);
        for (const r of readings) {
          const hour = new Date(r.timestamp).getHours();
          hourly[hour] = r.avg_watts;
        }
        setHeatData(hourly);
      } catch {
        // keep zeros on error
      } finally {
        setLoading(false);
      }
    };
    fetchToday();
  }, []);

  const totalWh = Math.round(heatData.reduce((a, b) => a + b, 0));

  return (
    <div className="glass-card p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber" /> Energy Usage
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin inline" />
          ) : (
            <>~{(totalWh / 1000).toFixed(1)} kWh today</>
          )}
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {heatData.map((value, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02, type: "spring", stiffness: 300, damping: 20 }}
            className="aspect-square rounded-sm relative group cursor-default"
            style={{ backgroundColor: getHeatColor(value) }}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10
                          bg-popover border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground whitespace-nowrap shadow-lg">
              {String(i).padStart(2, "0")}:00 — {Math.round(value)}W
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between mt-2 text-[9px] font-mono text-muted-foreground">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>

      <div className="flex items-center gap-2 mt-3 justify-center">
        <span className="text-[9px] text-muted-foreground">Low</span>
        {[15, 30, 50, 70, 90].map((v) => (
          <div
            key={v}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getHeatColor(v) }}
          />
        ))}
        <span className="text-[9px] text-muted-foreground">High</span>
      </div>
    </div>
  );
};

export default EnergyHeatmap;
