"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const CircadianSlider = () => {
  const [kelvin, setKelvin] = useState(3500);
  const [syncSun, setSyncSun] = useState(false);

  const pct = ((kelvin - 2000) / 4500) * 100;

  const warmColor = "hsl(30, 100%, 50%)";
  const coolColor = "hsl(210, 100%, 70%)";

  const thumbColor =
    kelvin < 3000
      ? "hsl(30, 100%, 50%)"
      : kelvin < 4500
        ? "hsl(38, 92%, 50%)"
        : kelvin < 5500
          ? "hsl(50, 80%, 70%)"
          : "hsl(210, 100%, 70%)";

  return (
    <div className="glass-card p-5 space-y-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Color Temperature</h3>
        <span className="font-mono text-xs text-muted-foreground">{kelvin}K</span>
      </div>

      <div className="relative">
        <div
          className="h-2 rounded-full w-full"
          style={{
            background: `linear-gradient(to right, ${warmColor}, hsl(38,92%,50%), hsl(50,80%,70%), ${coolColor})`,
          }}
        />
        <input
          type="range"
          min={2000}
          max={6500}
          step={100}
          value={kelvin}
          onChange={(e) => setKelvin(Number(e.target.value))}
          className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-background shadow-lg pointer-events-none"
          style={{
            left: `calc(${pct}% - 10px)`,
            backgroundColor: thumbColor,
            boxShadow: `0 0 12px ${thumbColor}`,
          }}
          layout
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      </div>

      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
        <span>2000K Warm</span>
        <span>6500K Cool</span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {syncSun ? (
              <motion.div
                key="active"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Sun className="w-4 h-4 text-amber" style={{ filter: "drop-shadow(0 0 6px hsl(38 92% 50% / 0.6))" }} />
              </motion.div>
            ) : (
              <motion.div
                key="inactive"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
              >
                <Sun className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-xs text-muted-foreground">Sync with Sun</span>
        </div>
        <Switch checked={syncSun} onCheckedChange={setSyncSun} />
      </div>

      {syncSun && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-[10px] font-mono text-amber text-center"
          style={{ textShadow: "0 0 8px hsl(38 92% 50% / 0.4)" }}
        >
          Solar Path Active — Following circadian rhythm
        </motion.div>
      )}
    </div>
  );
};

export default CircadianSlider;
