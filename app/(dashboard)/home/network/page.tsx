"use client";

import { motion } from "framer-motion";
import {
  Wifi,
  WifiOff,
  Globe,
  Smartphone,
  Laptop,
  Tv,
  Monitor,
  HardDrive,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { useFleet } from "@/hooks/useFleet";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const CONNECTED_DEVICES = [
  { name: "Mom's iPhone", icon: Smartphone, type: "Phone", ip: "192.168.1.101" },
  { name: "Dad's Laptop", icon: Laptop, type: "Laptop", ip: "192.168.1.102" },
  { name: "Living Room TV", icon: Tv, type: "Smart TV", ip: "192.168.1.103" },
  { name: "Office Desktop", icon: Monitor, type: "Desktop", ip: "192.168.1.104" },
  { name: "NAS Storage", icon: HardDrive, type: "Storage", ip: "192.168.1.105" },
  { name: "Guest Phone", icon: Smartphone, type: "Phone", ip: "192.168.1.106" },
];

const HomeNetworkPage = () => {
  const { aggregated } = useFleet();
  const isOnline = aggregated.onlineNodes > 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 max-w-5xl mx-auto space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="text-xl font-semibold text-foreground">
          Network Status
        </h1>
        <p className="text-sm text-muted-foreground">
          Your home network at a glance
        </p>
      </motion.div>

      {/* Internet Status Banner */}
      <motion.div
        variants={item}
        className={`glass-card p-5 flex items-center gap-4 ${isOnline ? "border-emerald/20" : "border-crimson/20"}`}
      >
        <div
          className={`p-3 rounded-xl ${isOnline ? "bg-emerald/10" : "bg-crimson/10"}`}
        >
          {isOnline ? (
            <Wifi className="w-6 h-6 text-emerald" />
          ) : (
            <WifiOff className="w-6 h-6 text-crimson" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold text-foreground">
            {isOnline ? "Internet is Working" : "Internet is Down"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isOnline
              ? "Everything looks good — you're connected!"
              : "There might be an issue with your connection"}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${isOnline ? "bg-emerald/10 text-emerald" : "bg-crimson/10 text-crimson"}`}
        >
          {isOnline ? "Online" : "Offline"}
        </div>
      </motion.div>

      {/* Speed Cards */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <div className="glass-card p-4 flex items-center gap-3">
          <ArrowDown className="w-5 h-5 text-cyan" />
          <div>
            <p className="text-xs text-muted-foreground">Download</p>
            <p className="text-lg font-semibold text-foreground">
              245{" "}
              <span className="text-xs text-muted-foreground">Mbps</span>
            </p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <ArrowUp className="w-5 h-5 text-magenta" />
          <div>
            <p className="text-xs text-muted-foreground">Upload</p>
            <p className="text-lg font-semibold text-foreground">
              42{" "}
              <span className="text-xs text-muted-foreground">Mbps</span>
            </p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <Globe className="w-5 h-5 text-emerald" />
          <div>
            <p className="text-xs text-muted-foreground">Ping</p>
            <p className="text-lg font-semibold text-foreground">
              12 <span className="text-xs text-muted-foreground">ms</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Connected Devices */}
      <motion.div variants={item}>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Connected Devices ({CONNECTED_DEVICES.length})
        </h2>
        <div className="space-y-2">
          {CONNECTED_DEVICES.map((device) => (
            <motion.div
              key={device.ip}
              variants={item}
              className="glass-card p-3 flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-secondary">
                <device.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {device.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {device.type}
                </p>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:block">
                {device.ip}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald shrink-0" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HomeNetworkPage;
