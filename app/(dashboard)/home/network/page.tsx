"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  QrCode,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  Users,
  Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useFleet } from "@/hooks/useFleet";
import { useAuthStore } from "@/store/useAuthStore";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

interface WifiNetwork {
  id: number;
  ssid: string;
  password: string;
  security: string;
  band: string;
  description: string;
  is_guest: boolean;
  enabled: boolean;
}

const CONNECTED_DEVICES = [
  { name: "Mom's iPhone", icon: Smartphone, type: "Phone", ip: "192.168.1.101" },
  { name: "Dad's Laptop", icon: Laptop, type: "Laptop", ip: "192.168.1.102" },
  { name: "Living Room TV", icon: Tv, type: "Smart TV", ip: "192.168.1.103" },
  { name: "Office Desktop", icon: Monitor, type: "Desktop", ip: "192.168.1.104" },
  { name: "NAS Storage", icon: HardDrive, type: "Storage", ip: "192.168.1.105" },
  { name: "Guest Phone", icon: Smartphone, type: "Phone", ip: "192.168.1.106" },
];

const wifiQrString = (ssid: string, password: string, security: string) =>
  `WIFI:T:${security};S:${ssid};P:${password};;`;

const WifiCard = ({ network }: { network: WifiNetwork }) => {
  const [showQr, setShowQr] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const token = useAuthStore((s) => s.token);
  const [credentials, setCredentials] = useState<{ password: string } | null>(null);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch(`/api/wifi/${network.id}/credentials`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCredentials(data);
      }
    } catch {
      // use the password from list if credentials fetch fails
    }
  }, [network.id, token]);

  // Fetch full credentials when QR or show password is first requested
  useEffect(() => {
    if ((showQr || showPassword) && !credentials) {
      fetchCredentials();
    }
  }, [showQr, showPassword, credentials, fetchCredentials]);

  const password = credentials?.password || network.password || "••••••••";
  const IconComponent = network.is_guest ? Users : Lock;
  const color = network.is_guest ? "text-amber" : "text-cyan";

  const copyPassword = async () => {
    if (!credentials) await fetchCredentials();
    const pw = credentials?.password || network.password;
    if (pw) {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div layout className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-secondary ${color}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{network.ssid}</p>
            <p className="text-[11px] text-muted-foreground">{network.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
            {network.band}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
            {network.security}
          </span>
        </div>
      </div>

      {/* Password row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-white/[0.04]">
          <span className="text-xs font-mono text-muted-foreground flex-1">
            {showPassword ? password : "••••••••••••"}
          </span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPassword(!showPassword)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </motion.button>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          onClick={copyPassword}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check className="w-4 h-4 text-emerald" />
              </motion.div>
            ) : (
              <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Copy className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          onClick={() => setShowQr(!showQr)}
          className={`p-2 rounded-lg transition-colors ${showQr ? "bg-primary/10 text-primary" : "bg-secondary hover:bg-secondary/80 text-muted-foreground"}`}
        >
          <QrCode className="w-4 h-4" />
        </motion.button>
      </div>

      {/* QR Code */}
      <AnimatePresence>
        {showQr && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col items-center gap-3 pt-2 pb-1">
              <div className="p-3 rounded-xl bg-white">
                <QRCodeSVG
                  value={wifiQrString(network.ssid, password, network.security)}
                  size={160}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-[10px] font-mono text-muted-foreground text-center">
                Scan with your phone camera to connect
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const HomeNetworkPage = () => {
  const { aggregated } = useFleet();
  const token = useAuthStore((s) => s.token);
  const isOnline = aggregated.onlineNodes > 0;
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNetworks = async () => {
      try {
        const res = await fetch("/api/wifi", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data: WifiNetwork[] = await res.json();
          setNetworks(data.filter((n) => n.enabled));
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchNetworks();
  }, [token]);

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

      {/* WiFi Quick Connect */}
      <motion.div variants={item}>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Wifi className="w-4 h-4" /> Quick Connect
        </h2>
        {loading ? (
          <div className="glass-card p-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading networks...</span>
          </div>
        ) : networks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {networks.map((network) => (
              <WifiCard key={network.id} network={network} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 text-center text-sm text-muted-foreground">
            No WiFi networks available
          </div>
        )}
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
