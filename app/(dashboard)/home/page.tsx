"use client";

import { motion } from "framer-motion";
import {
  Cloud,
  Sun,
  Wifi,
  WifiOff,
  Thermometer,
  Clock,
  MessageSquare,
  ChevronRight,
  Lightbulb,
  Shield,
} from "lucide-react";
import { useFleet } from "@/hooks/useFleet";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const QUICK_LINKS = [
  {
    label: "Smart Home",
    icon: Lightbulb,
    path: "/home/devices",
    color: "text-amber",
  },
  {
    label: "Network",
    icon: Wifi,
    path: "/home/network",
    color: "text-cyan",
  },
  {
    label: "Media & Files",
    icon: Cloud,
    path: "/home/media",
    color: "text-magenta",
  },
];

const ANNOUNCEMENTS = [
  {
    text: "Wi-Fi maintenance scheduled for Saturday 2 AM",
    time: "2h ago",
    type: "info" as const,
  },
  {
    text: "New shared photos uploaded to Family Album",
    time: "5h ago",
    type: "success" as const,
  },
  {
    text: "Smart thermostat set to eco mode",
    time: "1d ago",
    type: "info" as const,
  },
];

const HomePage = () => {
  const { user } = useAuthStore();
  const { aggregated } = useFleet();
  const router = useRouter();
  const displayName = user?.displayName || "User";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const now = new Date();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 max-w-5xl mx-auto space-y-6"
    >
      {/* Greeting */}
      <motion.div variants={item} className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          {greeting}, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground font-mono">
          {now.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </motion.div>

      {/* Status Cards */}
      <motion.div
        variants={item}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber">
            <Sun className="w-5 h-5" />
            <span className="text-xs font-mono text-muted-foreground">
              Weather
            </span>
          </div>
          <p className="text-xl font-semibold text-foreground">72°F</p>
          <p className="text-[11px] text-muted-foreground">Partly Cloudy</p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan">
            {aggregated.onlineNodes > 0 ? (
              <Wifi className="w-5 h-5" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
            <span className="text-xs font-mono text-muted-foreground">
              Internet
            </span>
          </div>
          <p className="text-xl font-semibold text-foreground">
            {aggregated.onlineNodes > 0 ? "Online" : "Offline"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            All systems normal
          </p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald">
            <Shield className="w-5 h-5" />
            <span className="text-xs font-mono text-muted-foreground">
              Security
            </span>
          </div>
          <p className="text-xl font-semibold text-foreground">Secure</p>
          <p className="text-[11px] text-muted-foreground">VPN active</p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-magenta">
            <Thermometer className="w-5 h-5" />
            <span className="text-xs font-mono text-muted-foreground">
              Home Temp
            </span>
          </div>
          <p className="text-xl font-semibold text-foreground">71°F</p>
          <p className="text-[11px] text-muted-foreground">Thermostat: Auto</p>
        </div>
      </motion.div>

      {/* Quick Links */}
      <motion.div variants={item}>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => (
            <motion.button
              key={link.path}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(link.path)}
              className="glass-card p-4 flex items-center gap-3 text-left hover:bg-secondary/50 transition-colors"
            >
              <div className={`p-2 rounded-lg bg-secondary ${link.color}`}>
                <link.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-foreground flex-1">
                {link.label}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Announcements */}
      <motion.div variants={item}>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Household Updates
        </h2>
        <div className="space-y-2">
          {ANNOUNCEMENTS.map((a, i) => (
            <motion.div
              key={i}
              variants={item}
              className="glass-card p-3 flex items-start gap-3"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  a.type === "success" ? "bg-emerald" : "bg-cyan"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{a.text}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {a.time}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HomePage;
