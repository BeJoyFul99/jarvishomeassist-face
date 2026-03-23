"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Thermometer,
  Video,
  Speaker,
  Signal,
  Sun,
  Moon,
  Loader2,
  WifiOff,
  Palette,
  Flame,
  Snowflake,
  TreePine,
  PartyPopper,
  Coffee,
  Waves,
  Heart,
  Sparkles,
  MonitorPlay,
  Bed,
  Focus,
  Zap,
  CloudMoon,
  Leaf,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/useAuthStore";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const DEVICE_TYPE_ICONS: Record<string, typeof Lightbulb> = {
  light: Lightbulb,
  thermostat: Thermometer,
  camera: Video,
  speaker: Speaker,
  sensor: Signal,
};

// WiZ scene presets with icons and colors
const WIZ_SCENES = [
  { id: 11, name: "Warm White", icon: Sun, color: "#FFB347" },
  { id: 12, name: "Daylight", icon: Sun, color: "#87CEEB" },
  { id: 13, name: "Cool White", icon: Snowflake, color: "#E0E8FF" },
  { id: 6,  name: "Cozy", icon: Coffee, color: "#D4915C" },
  { id: 14, name: "Night Light", icon: CloudMoon, color: "#FFD700" },
  { id: 16, name: "Relax", icon: Leaf, color: "#90EE90" },
  { id: 15, name: "Focus", icon: Focus, color: "#FFFFFF" },
  { id: 29, name: "Candlelight", icon: Flame, color: "#FF6B35" },
  { id: 5,  name: "Fireplace", icon: Flame, color: "#FF4500" },
  { id: 2,  name: "Romance", icon: Heart, color: "#FF69B4" },
  { id: 3,  name: "Sunset", icon: Sparkles, color: "#FF6347" },
  { id: 1,  name: "Ocean", icon: Waves, color: "#0077BE" },
  { id: 7,  name: "Forest", icon: TreePine, color: "#228B22" },
  { id: 4,  name: "Party", icon: PartyPopper, color: "#FF00FF" },
  { id: 18, name: "TV Time", icon: MonitorPlay, color: "#4169E1" },
  { id: 10, name: "Bedtime", icon: Bed, color: "#483D8B" },
  { id: 9,  name: "Wake Up", icon: Zap, color: "#FFD700" },
  { id: 30, name: "Golden White", icon: Sun, color: "#DAA520" },
];

// Quick-pick RGB colors
const COLOR_PRESETS = [
  { name: "Red", r: 255, g: 0, b: 0 },
  { name: "Orange", r: 255, g: 128, b: 0 },
  { name: "Yellow", r: 255, g: 255, b: 0 },
  { name: "Lime", r: 128, g: 255, b: 0 },
  { name: "Green", r: 0, g: 255, b: 0 },
  { name: "Teal", r: 0, g: 255, b: 128 },
  { name: "Cyan", r: 0, g: 255, b: 255 },
  { name: "Sky", r: 0, g: 128, b: 255 },
  { name: "Blue", r: 0, g: 0, b: 255 },
  { name: "Purple", r: 128, g: 0, b: 255 },
  { name: "Magenta", r: 255, g: 0, b: 255 },
  { name: "Pink", r: 255, g: 0, b: 128 },
];

interface SmartDevice {
  id: number;
  name: string;
  room: string;
  device_type: string;
  brand: string;
  model: string;
  ip: string;
  mac: string;
  online: boolean;
  state: Record<string, any>;
}

const HomeDevicesPage = () => {
  const token = useAuthStore((s) => s.token);
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"scenes" | "colors" | "temp">("scenes");
  const [deviceErrors, setDeviceErrors] = useState<Record<number, string>>({});
  const [busyDevices, setBusyDevices] = useState<Set<number>>(new Set());
  const controlDebounce = useRef<NodeJS.Timeout | null>(null);

  const showDeviceError = useCallback((deviceId: number, message: string) => {
    setDeviceErrors((prev) => ({ ...prev, [deviceId]: message }));
    setTimeout(() => {
      setDeviceErrors((prev) => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
    }, 4000);
  }, []);

  const authHeaders = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch("/api/devices", { headers: authHeaders() });
        if (res.ok) {
          const data: SmartDevice[] = await res.json();
          setDevices(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, [authHeaders]);

  const sendControl = useCallback(async (deviceId: number, body: Record<string, any>, rollback?: () => void) => {
    setBusyDevices((prev) => new Set(prev).add(deviceId));
    try {
      const res = await fetch(`/api/devices/${deviceId}/control`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setDevices((prev) =>
          prev.map((d) => (d.id === data.device.id ? data.device : d))
        );
      } else {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        showDeviceError(deviceId, err.detail || err.error || "Device unreachable");
        setDevices((prev) =>
          prev.map((d) => (d.id === deviceId ? { ...d, online: false } : d))
        );
        rollback?.();
      }
    } catch {
      showDeviceError(deviceId, "Network error — could not reach device");
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, online: false } : d))
      );
      rollback?.();
    } finally {
      setBusyDevices((prev) => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
    }
  }, [authHeaders, showDeviceError]);

  const toggle = async (device: SmartDevice) => {
    const action = device.state?.on ? "off" : "on";
    const prevOn = device.state?.on;
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id ? { ...d, state: { ...d.state, on: !d.state?.on } } : d
      )
    );
    sendControl(device.id, { action }, () => {
      // Revert toggle
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id ? { ...d, state: { ...d.state, on: prevOn } } : d
        )
      );
    });
  };

  const setBrightness = (device: SmartDevice, val: number) => {
    const prevBrightness = device.state?.brightness;
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id ? { ...d, state: { ...d.state, brightness: val } } : d
      )
    );
    if (controlDebounce.current) clearTimeout(controlDebounce.current);
    controlDebounce.current = setTimeout(() => {
      sendControl(device.id, { action: "brightness", brightness: val }, () => {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === device.id ? { ...d, state: { ...d.state, brightness: prevBrightness } } : d
          )
        );
      });
    }, 300);
  };

  const setColorTemp = (device: SmartDevice, temp: number) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id
          ? { ...d, state: { ...d.state, color_temp: temp, r: undefined, g: undefined, b: undefined, scene_name: undefined } }
          : d
      )
    );
    if (controlDebounce.current) clearTimeout(controlDebounce.current);
    controlDebounce.current = setTimeout(() => {
      sendControl(device.id, { action: "color_temp", color_temp: temp });
    }, 300);
  };

  const setRGB = (device: SmartDevice, r: number, g: number, b: number) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id
          ? { ...d, state: { ...d.state, r, g, b, color_temp: undefined, scene_name: undefined } }
          : d
      )
    );
    sendControl(device.id, { action: "rgb", r, g, b, brightness: device.state?.brightness || 100 });
  };

  const setScene = (device: SmartDevice, sceneId: number, sceneName: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id
          ? { ...d, state: { ...d.state, on: true, scene_id: sceneId, scene_name: sceneName, r: undefined, g: undefined, b: undefined, color_temp: undefined } }
          : d
      )
    );
    sendControl(device.id, { action: "scene", scene_id: sceneId });
  };

  const allLights = (on: boolean) => {
    const lights = devices.filter((d) => d.device_type === "light");
    lights.forEach((device) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id ? { ...d, state: { ...d.state, on } } : d
        )
      );
      sendControl(device.id, { action: on ? "on" : "off" });
    });
  };

  const rooms = [...new Set(devices.map((d) => d.room))];

  // Helper to get current color display for a device
  const getDeviceColorStyle = (device: SmartDevice) => {
    const s = device.state;
    if (s?.r != null && s?.g != null && s?.b != null) {
      return `rgb(${s.r}, ${s.g}, ${s.b})`;
    }
    if (s?.color_temp != null) {
      // Approximate color temp to RGB for display
      const t = s.color_temp;
      if (t <= 3000) return "#FFB347";
      if (t <= 4000) return "#FFE4B5";
      if (t <= 5000) return "#FFF8DC";
      return "#F0F8FF";
    }
    return undefined;
  };

  const getDeviceSubtext = (device: SmartDevice) => {
    const s = device.state;
    if (!s?.on) return "Off";
    if (s?.scene_name) return s.scene_name;
    if (s?.r != null) return `RGB (${s.r}, ${s.g}, ${s.b})`;
    if (s?.color_temp) return `${s.color_temp}K`;
    if (s?.brightness != null) return `${s.brightness}% brightness`;
    return "On";
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex items-center justify-center gap-2 text-muted-foreground min-h-[300px]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading devices...</span>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 max-w-5xl mx-auto space-y-6"
    >
      <motion.div
        variants={item}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold text-foreground">Smart Home</h1>
          <p className="text-sm text-muted-foreground">
            {devices.filter((d) => d.state?.on).length} devices active
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => allLights(true)}
            className="px-3 py-1.5 rounded-lg glass-surface text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Sun className="w-3.5 h-3.5 text-amber" /> All Lights On
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => allLights(false)}
            className="px-3 py-1.5 rounded-lg glass-surface text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Moon className="w-3.5 h-3.5 text-cyan" /> All Lights Off
          </motion.button>
        </div>
      </motion.div>

      {devices.length === 0 && (
        <motion.div variants={item} className="glass-card p-8 text-center">
          <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No smart devices registered yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add devices from the admin Devices page.</p>
        </motion.div>
      )}

      {rooms.map((room) => (
        <motion.div key={room} variants={item} className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {room}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {devices
              .filter((d) => d.room === room)
              .map((device) => {
                const Icon = DEVICE_TYPE_ICONS[device.device_type] || Lightbulb;
                const isOn = device.state?.on;
                const brightness = device.state?.brightness;
                const isExpanded = expandedId === device.id && isOn && device.device_type === "light";
                const colorStyle = getDeviceColorStyle(device);
                const isWiz = device.brand === "wiz";

                return (
                  <motion.div
                    key={device.id}
                    layout
                    whileHover={!isExpanded ? { scale: 1.02, y: -2 } : undefined}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={`glass-card p-4 space-y-3 transition-all ${
                      isOn ? "border-primary/20 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.15)]" : ""
                    } ${isExpanded ? "sm:col-span-2 lg:col-span-3" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={isOn ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                          transition={isOn ? { duration: 0.6, ease: "easeInOut" } : { type: "spring", stiffness: 500, damping: 15 }}
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: isOn && colorStyle
                              ? `${colorStyle}20`
                              : isOn
                                ? "hsl(var(--primary) / 0.1)"
                                : "hsl(var(--secondary) / 0.5)",
                          }}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{
                              color: isOn && colorStyle ? colorStyle : isOn ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                            }}
                          />
                        </motion.div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {device.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {getDeviceSubtext(device)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {busyDevices.has(device.id) && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        )}
                        {isOn && device.device_type === "light" && isWiz && (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setExpandedId(isExpanded ? null : device.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isExpanded
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            }`}
                          >
                            <Palette className="w-4 h-4" />
                          </motion.button>
                        )}
                        <Switch
                          checked={!!isOn}
                          disabled={busyDevices.has(device.id)}
                          onCheckedChange={() => toggle(device)}
                        />
                      </div>
                    </div>

                    {/* Error banner */}
                    <AnimatePresence>
                      {deviceErrors[device.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-crimson/10 border border-crimson/20">
                            <WifiOff className="w-3.5 h-3.5 text-crimson shrink-0" />
                            <span className="text-[11px] text-crimson">{deviceErrors[device.id]}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Brightness slider */}
                    <AnimatePresence>
                      {isOn && brightness != null && device.device_type === "light" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        >
                          <div className="flex items-center gap-3">
                            <Sun className="w-3 h-3 text-muted-foreground shrink-0" />
                            <Slider
                              value={[brightness]}
                              min={10}
                              max={100}
                              step={1}
                              onValueCommit={([v]) => setBrightness(device, v)}
                              onValueChange={([v]) =>
                                setDevices((prev) =>
                                  prev.map((d) =>
                                    d.id === device.id
                                      ? { ...d, state: { ...d.state, brightness: v } }
                                      : d
                                  )
                                )
                              }
                              className="flex-1"
                            />
                            <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                              {brightness}%
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Expanded light controls (color, scenes, temperature) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 border-t border-white/[0.06] space-y-4">
                            {/* Tab switcher */}
                            <div className="flex gap-1 p-0.5 bg-secondary/50 rounded-lg w-fit">
                              {(["scenes", "colors", "temp"] as const).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setActiveTab(t)}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    activeTab === t
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {t === "scenes" ? "Scenes" : t === "colors" ? "Colors" : "Temperature"}
                                </button>
                              ))}
                            </div>

                            <AnimatePresence mode="wait">
                              {/* Scenes grid */}
                              {activeTab === "scenes" && (
                                <motion.div
                                  key="scenes"
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  transition={{ duration: 0.2 }}
                                  className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2"
                                >
                                  {WIZ_SCENES.map((scene) => {
                                    const SceneIcon = scene.icon;
                                    const isActive = device.state?.scene_id === scene.id;
                                    return (
                                      <motion.button
                                        key={scene.id}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setScene(device, scene.id, scene.name)}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                                          isActive
                                            ? "bg-primary/15 border border-primary/30 shadow-sm"
                                            : "bg-secondary/40 border border-transparent hover:bg-secondary/70"
                                        }`}
                                      >
                                        <SceneIcon
                                          className="w-5 h-5"
                                          style={{ color: scene.color }}
                                        />
                                        <span className={`text-[10px] font-medium leading-tight text-center ${
                                          isActive ? "text-primary" : "text-muted-foreground"
                                        }`}>
                                          {scene.name}
                                        </span>
                                      </motion.button>
                                    );
                                  })}
                                </motion.div>
                              )}

                              {/* Color picker */}
                              {activeTab === "colors" && (
                                <motion.div
                                  key="colors"
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  transition={{ duration: 0.2 }}
                                  className="space-y-3"
                                >
                                  {/* Color circle presets */}
                                  <div className="flex flex-wrap gap-2 justify-center">
                                    {COLOR_PRESETS.map((c) => {
                                      const isActive =
                                        device.state?.r === c.r &&
                                        device.state?.g === c.g &&
                                        device.state?.b === c.b;
                                      return (
                                        <motion.button
                                          key={c.name}
                                          whileHover={{ scale: 1.15 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => setRGB(device, c.r, c.g, c.b)}
                                          title={c.name}
                                          className={`w-9 h-9 rounded-full transition-all ${
                                            isActive
                                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                              : "hover:ring-1 hover:ring-white/20"
                                          }`}
                                          style={{ backgroundColor: `rgb(${c.r}, ${c.g}, ${c.b})` }}
                                        />
                                      );
                                    })}
                                  </div>

                                  {/* Custom color input */}
                                  <div className="flex items-center gap-3 justify-center">
                                    <label className="text-xs text-muted-foreground">Custom:</label>
                                    <input
                                      type="color"
                                      value={
                                        device.state?.r != null
                                          ? `#${(
                                              (1 << 24) +
                                              ((device.state.r ?? 255) << 16) +
                                              ((device.state.g ?? 255) << 8) +
                                              (device.state.b ?? 255)
                                            )
                                              .toString(16)
                                              .slice(1)}`
                                          : "#ffffff"
                                      }
                                      onChange={(e) => {
                                        const hex = e.target.value;
                                        const r = parseInt(hex.slice(1, 3), 16);
                                        const g = parseInt(hex.slice(3, 5), 16);
                                        const b = parseInt(hex.slice(5, 7), 16);
                                        setRGB(device, r, g, b);
                                      }}
                                      className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                                    />
                                    {device.state?.r != null && (
                                      <span className="text-[10px] font-mono text-muted-foreground">
                                        rgb({device.state.r}, {device.state.g}, {device.state.b})
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              )}

                              {/* Color temperature */}
                              {activeTab === "temp" && (
                                <motion.div
                                  key="temp"
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  transition={{ duration: 0.2 }}
                                  className="space-y-4"
                                >
                                  {/* Temperature gradient bar */}
                                  <div className="space-y-2">
                                    <div
                                      className="h-3 rounded-full"
                                      style={{
                                        background: "linear-gradient(to right, #FF8C00, #FFB347, #FFE4B5, #FFFAF0, #F0F8FF, #E0E8FF, #B0C4DE)",
                                      }}
                                    />
                                    <Slider
                                      value={[device.state?.color_temp ?? 4000]}
                                      min={2200}
                                      max={6500}
                                      step={100}
                                      onValueCommit={([v]) => setColorTemp(device, v)}
                                      onValueChange={([v]) =>
                                        setDevices((prev) =>
                                          prev.map((d) =>
                                            d.id === device.id
                                              ? { ...d, state: { ...d.state, color_temp: v, r: undefined, g: undefined, b: undefined, scene_name: undefined } }
                                              : d
                                          )
                                        )
                                      }
                                    />
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                                      <span className="flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-orange-400" /> 2200K Warm
                                      </span>
                                      <span className="text-xs text-foreground font-medium">
                                        {device.state?.color_temp ?? 4000}K
                                      </span>
                                      <span className="flex items-center gap-1">
                                        Cool 6500K <Snowflake className="w-3 h-3 text-blue-300" />
                                      </span>
                                    </div>
                                  </div>

                                  {/* Quick temperature presets */}
                                  <div className="flex gap-2 justify-center flex-wrap">
                                    {[
                                      { label: "Candle", temp: 2200, color: "#FF8C00" },
                                      { label: "Warm", temp: 2700, color: "#FFB347" },
                                      { label: "Soft", temp: 3000, color: "#FFD699" },
                                      { label: "Neutral", temp: 4000, color: "#FFFAF0" },
                                      { label: "Day", temp: 5000, color: "#F5F5F5" },
                                      { label: "Cool", temp: 6500, color: "#E0E8FF" },
                                    ].map((p) => {
                                      const isActive = device.state?.color_temp === p.temp;
                                      return (
                                        <motion.button
                                          key={p.temp}
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => setColorTemp(device, p.temp)}
                                          className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5 ${
                                            isActive
                                              ? "bg-primary/15 border border-primary/30 text-primary"
                                              : "bg-secondary/40 border border-transparent text-muted-foreground hover:bg-secondary/70"
                                          }`}
                                        >
                                          <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: p.color }}
                                          />
                                          {p.label}
                                        </motion.button>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default HomeDevicesPage;
