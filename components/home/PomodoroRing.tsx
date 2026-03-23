"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";

const FOCUS_MINUTES = 25;
const TOTAL_SECONDS = FOCUS_MINUTES * 60;

const PomodoroRing = () => {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = secondsLeft / TOTAL_SECONDS;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const lightMode =
    progress > 0.6
      ? "Focus: Cool White"
      : progress > 0.3
        ? "Transition: Warm"
        : "Wind Down: Amber";

  const ringColor =
    progress > 0.6
      ? "hsl(var(--cyan))"
      : progress > 0.3
        ? "hsl(var(--amber))"
        : "hsl(var(--volcano))";

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, secondsLeft]);

  useEffect(() => {
    if (secondsLeft <= 0) setRunning(false);
  }, [secondsLeft]);

  const reset = () => {
    setRunning(false);
    setSecondsLeft(TOTAL_SECONDS);
  };

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="glass-card p-5 backdrop-blur-md flex flex-col items-center">
      <h3 className="text-sm font-medium text-foreground mb-4">Pomodoro Focus</h3>

      <div className="relative w-[180px] h-[180px]">
        <svg width="180" height="180" className="-rotate-90">
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="6"
          />
          <motion.circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 8px ${ringColor})` }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-mono font-semibold text-foreground">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground mt-1">{lightMode}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setRunning(!running)}
          className="p-2.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
        >
          {running ? (
            <Pause className="w-4 h-4 text-foreground" />
          ) : (
            <Play className="w-4 h-4 text-foreground" />
          )}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={reset}
          className="p-2.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      </div>
    </div>
  );
};

export default PomodoroRing;
