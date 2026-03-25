"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Laptop, Smartphone, Lightbulb, Wifi, ShieldCheck, ShieldAlert } from "lucide-react";

interface NetworkDevice {
  name: string;
  icon: "laptop" | "phone" | "bulb";
  mac: string;
  verified: boolean;
  latency: number[];
}

const ICON_MAP = {
  laptop: Laptop,
  phone: Smartphone,
  bulb: Lightbulb,
};

const INITIAL_DEVICES: NetworkDevice[] = [
  { name: "MacBook Pro", icon: "laptop", mac: "A4:83:E7:2F:...", verified: true, latency: [4, 5, 3, 6, 4, 5, 3, 7, 4, 5, 6, 3] },
  { name: "iPhone 15", icon: "phone", mac: "B2:7D:1A:44:...", verified: true, latency: [8, 12, 9, 11, 10, 8, 13, 9, 11, 10, 8, 12] },
  { name: "Living Room Light", icon: "bulb", mac: "C8:2B:96:01:...", verified: true, latency: [2, 2, 3, 2, 2, 3, 2, 2, 3, 2, 2, 3] },
  { name: "Unknown Device", icon: "phone", mac: "FF:A1:22:B7:...", verified: false, latency: [25, 32, 28, 45, 30, 22, 38, 29, 33, 27, 31, 40] },
  { name: "Smart Speaker", icon: "bulb", mac: "D4:6E:0E:99:...", verified: true, latency: [3, 4, 3, 5, 3, 4, 3, 5, 4, 3, 4, 3] },
];

const Sparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  const h = 20;
  const w = 60;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");

  return (
    <svg width={w} height={h} className="overflow-hidden">
      <motion.polyline
        points={points}
        fill="none"
        stroke="hsl(var(--cyan))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
};

const NetworkPulse = () => {
  const [devices, setDevices] = useState(INITIAL_DEVICES);

  useEffect(() => {
    const interval = setInterval(() => {
      setDevices((prev) =>
        prev.map((d) => ({
          ...d,
          latency: [...d.latency.slice(1), Math.max(1, d.latency[d.latency.length - 1] + Math.floor(Math.random() * 6 - 3))],
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan" /> Network Pulse
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          {devices.length} devices
        </span>
      </div>

      <div className="space-y-1">
        {devices.map((device, i) => {
          const DeviceIcon = ICON_MAP[device.icon];
          const avgLatency = Math.round(device.latency.reduce((a, b) => a + b, 0) / device.latency.length);

          return (
            <motion.div
              key={device.mac}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <div className="p-1.5 rounded-md bg-secondary">
                <DeviceIcon className="w-4 h-4 text-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{device.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{device.mac}</p>
              </div>

              <div className="hidden sm:block">
                <Sparkline data={device.latency} />
              </div>

              <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
                {avgLatency}ms
              </span>

              {device.verified ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald/10 text-emerald text-[10px] font-mono">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-crimson/10 text-crimson text-[10px] font-mono">
                  <ShieldAlert className="w-3 h-3" /> Unknown
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default NetworkPulse;
