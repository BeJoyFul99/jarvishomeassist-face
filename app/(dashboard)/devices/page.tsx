"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Lightbulb, Thermometer, Camera, Speaker, WifiOff,
  Laptop, Smartphone, HardDrive, Monitor,
  Signal, Router, Settings as SettingsIcon, Plus, Trash2, Pencil, X, Check,
  ToggleLeft, ToggleRight, Search, Loader2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface SmartDevice {
  id: number;
  name: string;
  room: string;
  device_type: string;
  brand: string;
  model: string;
  ip: string;
  mac: string;
  firmware_ver: string;
  online: boolean;
  state: Record<string, any>;
  metadata: Record<string, any>;
}

interface NetworkDevice {
  id: string;
  name: string;
  ip: string;
  mac: string;
  icon: any;
  type: string;
  online: boolean;
  lastSeen: string;
  bandwidth: string;
}

const SMART_TYPE_ICONS: Record<string, any> = {
  light: Lightbulb,
  thermostat: Thermometer,
  camera: Camera,
  speaker: Speaker,
  sensor: Signal,
};

const NETWORK_TYPE_ICONS: Record<string, any> = {
  Computer: Laptop,
  Phone: Smartphone,
  Tablet: Smartphone,
  NAS: HardDrive,
  Server: HardDrive,
  Display: Monitor,
  "Access Point": Router,
};

const INITIAL_NETWORK_DEVICES: NetworkDevice[] = [
  { id: "n1", name: "MacBook Pro", ip: "192.168.1.42", mac: "A4:83:E7:2B:1C:9F", icon: Laptop, type: "Computer", online: true, lastSeen: "Now", bandwidth: "12.4 MB/s" },
  { id: "n2", name: "iPhone 15", ip: "192.168.1.55", mac: "B2:9A:F1:4C:8D:3E", icon: Smartphone, type: "Phone", online: true, lastSeen: "Now", bandwidth: "2.1 MB/s" },
  { id: "n3", name: "Synology NAS", ip: "192.168.1.10", mac: "00:11:32:AB:CD:EF", icon: HardDrive, type: "NAS", online: true, lastSeen: "Now", bandwidth: "45.2 MB/s" },
  { id: "n4", name: "Smart TV", ip: "192.168.1.80", mac: "C8:D7:19:5A:2B:FF", icon: Monitor, type: "Display", online: true, lastSeen: "Now", bandwidth: "8.7 MB/s" },
  { id: "n5", name: "iPad Air", ip: "192.168.1.63", mac: "D4:E6:B8:3C:9A:12", icon: Smartphone, type: "Tablet", online: false, lastSeen: "2h ago", bandwidth: "—" },
  { id: "n6", name: "HomeLab Server", ip: "192.168.1.2", mac: "00:25:90:FE:DC:BA", icon: HardDrive, type: "Server", online: true, lastSeen: "Now", bandwidth: "67.8 MB/s" },
  { id: "n7", name: "Wi-Fi AP (Upstairs)", ip: "192.168.1.3", mac: "F0:9F:C2:1A:5B:77", icon: Router, type: "Access Point", online: true, lastSeen: "Now", bandwidth: "—" },
];

export default function DevicesPage() {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkDevices, setNetworkDevices] = useState(INITIAL_NETWORK_DEVICES);
  const [tab, setTab] = useState<"smart" | "network">("smart");
  const [manageMode, setManageMode] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [deviceErrors, setDeviceErrors] = useState<Record<number, string>>({});
  const [busyDevices, setBusyDevices] = useState<Set<number>>(new Set());
  const [discoverResult, setDiscoverResult] = useState<{
    discovered: { ip: string; registered: boolean; mac?: string; module?: string }[];
    count: number;
  } | null>(null);
  const [discoverDialogOpen, setDiscoverDialogOpen] = useState(false);

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

  // Smart device dialog state
  const [smartDialogOpen, setSmartDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<SmartDevice | null>(null);
  const [smartForm, setSmartForm] = useState({
    name: "", room: "", device_type: "light", brand: "wiz", model: "", ip: "", mac: "",
  });

  // Network device dialog state
  const [netDialogOpen, setNetDialogOpen] = useState(false);
  const [editingNetDevice, setEditingNetDevice] = useState<NetworkDevice | null>(null);
  const [netForm, setNetForm] = useState({ name: "", ip: "", mac: "", type: "Computer" });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: number | string; kind: "smart" | "network" } | null>(null);

  const authHeaders = useCallback(() => {
    return { "Content-Type": "application/json" };
  }, []);

  // Fetch devices from API
  const fetchDevices = useCallback(async () => {
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
  }, [authHeaders]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const toggleDevice = async (device: SmartDevice) => {
    const action = device.state?.on ? "off" : "on";
    const prevOn = device.state?.on;
    // Optimistic update
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id ? { ...d, state: { ...d.state, on: !prevOn } } : d
      )
    );
    setBusyDevices((prev) => new Set(prev).add(device.id));
    try {
      const res = await fetch(`/api/devices/${device.id}/control`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setDevices((prev) =>
          prev.map((d) => (d.id === data.device.id ? data.device : d))
        );
      } else {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        showDeviceError(device.id, err.detail || err.error || "Device unreachable");
        setDevices((prev) =>
          prev.map((d) =>
            d.id === device.id ? { ...d, online: false, state: { ...d.state, on: prevOn } } : d
          )
        );
      }
    } catch {
      showDeviceError(device.id, "Network error — could not reach device");
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id ? { ...d, online: false, state: { ...d.state, on: prevOn } } : d
        )
      );
    } finally {
      setBusyDevices((prev) => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  const pollDeviceState = async (id: number) => {
    try {
      const res = await fetch(`/api/devices/${id}/state`, { headers: authHeaders() });
      if (res.ok) {
        const data: SmartDevice = await res.json();
        setDevices((prev) => prev.map((d) => (d.id === data.id ? data : d)));
      }
    } catch {
      // silent
    }
  };

  // Discover WiZ bulbs on network
  const discoverDevices = async () => {
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      const res = await fetch("/api/admin/devices/discover", {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoverResult(data);
        setDiscoverDialogOpen(true);
        if (data.discovered?.length > 0) {
          await fetchDevices();
        }
      } else {
        setDiscoverResult({ discovered: [], count: 0 });
        setDiscoverDialogOpen(true);
      }
    } catch {
      setDiscoverResult({ discovered: [], count: 0 });
      setDiscoverDialogOpen(true);
    } finally {
      setDiscovering(false);
    }
  };

  // Smart device CRUD
  const openAddSmart = () => {
    setEditingDevice(null);
    setSmartForm({ name: "", room: "", device_type: "light", brand: "wiz", model: "", ip: "", mac: "" });
    setSmartDialogOpen(true);
  };

  const openEditSmart = (device: SmartDevice) => {
    setEditingDevice(device);
    setSmartForm({
      name: device.name,
      room: device.room,
      device_type: device.device_type,
      brand: device.brand,
      model: device.model || "",
      ip: device.ip,
      mac: device.mac || "",
    });
    setSmartDialogOpen(true);
  };

  const saveSmart = async () => {
    if (!smartForm.name.trim() || !smartForm.ip.trim()) return;
    try {
      if (editingDevice) {
        const res = await fetch(`/api/admin/devices/${editingDevice.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(smartForm),
        });
        if (res.ok) {
          const updated: SmartDevice = await res.json();
          setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        }
      } else {
        const res = await fetch("/api/admin/devices", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(smartForm),
        });
        if (res.ok) {
          const created: SmartDevice = await res.json();
          setDevices((prev) => [...prev, created]);
        }
      }
    } catch {
      // silent
    }
    setSmartDialogOpen(false);
  };

  const deleteSmart = async (id: number) => {
    try {
      await fetch(`/api/admin/devices/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // silent
    }
    setDeleteTarget(null);
  };

  // Network device CRUD (still local state)
  const openAddNet = () => {
    setEditingNetDevice(null);
    setNetForm({ name: "", ip: "", mac: "", type: "Computer" });
    setNetDialogOpen(true);
  };

  const openEditNet = (device: NetworkDevice) => {
    setEditingNetDevice(device);
    setNetForm({ name: device.name, ip: device.ip, mac: device.mac, type: device.type });
    setNetDialogOpen(true);
  };

  const saveNet = () => {
    if (!netForm.name.trim()) return;
    if (editingNetDevice) {
      setNetworkDevices((prev) =>
        prev.map((d) =>
          d.id === editingNetDevice.id
            ? { ...d, name: netForm.name, ip: netForm.ip, mac: netForm.mac, type: netForm.type, icon: NETWORK_TYPE_ICONS[netForm.type] || Laptop }
            : d
        )
      );
    } else {
      const newDevice: NetworkDevice = {
        id: `net-${Date.now()}`,
        name: netForm.name,
        ip: netForm.ip,
        mac: netForm.mac,
        type: netForm.type,
        icon: NETWORK_TYPE_ICONS[netForm.type] || Laptop,
        online: true,
        lastSeen: "Now",
        bandwidth: "—",
      };
      setNetworkDevices((prev) => [...prev, newDevice]);
    }
    setNetDialogOpen(false);
  };

  const deleteNet = (id: string) => {
    setNetworkDevices((prev) => prev.filter((d) => d.id !== id));
    setDeleteTarget(null);
  };

  const onlineSmartCount = devices.filter((d) => d.online).length;
  const onlineNetCount = networkDevices.filter((d) => d.online).length;

  return (
    <div className="bg-background">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Home Devices</h1>
              <p className="text-sm text-muted-foreground">Smart home controls & network inventory</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {manageMode && tab === "smart" && (
              <>
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={discoverDevices}
                  disabled={discovering}
                  className="flex items-center gap-2 rounded-lg bg-cyan/10 border border-cyan/20 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-50"
                >
                  {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Discover WiZ
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={openAddSmart}
                  className="flex items-center gap-2 rounded-lg bg-emerald/10 border border-emerald/20 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-emerald transition-colors hover:bg-emerald/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Device
                </motion.button>
              </>
            )}
            {manageMode && tab === "network" && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={openAddNet}
                className="flex items-center gap-2 rounded-lg bg-emerald/10 border border-emerald/20 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-emerald transition-colors hover:bg-emerald/20"
              >
                <Plus className="w-4 h-4" />
                Add Device
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setManageMode(!manageMode)}
              className={`flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
                manageMode
                  ? "bg-crimson/10 border border-crimson/20 text-crimson hover:bg-crimson/20"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {manageMode ? <X className="w-4 h-4" /> : <SettingsIcon className="w-4 h-4" />}
              {manageMode ? "Done" : "Manage"}
            </motion.button>
          </div>
        </motion.div>

        {/* Summary cards */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Smart Devices", value: `${onlineSmartCount}/${devices.length}`, sub: "online", color: "text-emerald" },
            { label: "Lights On", value: String(devices.filter((d) => d.device_type === "light" && d.state?.on).length), sub: `of ${devices.filter((d) => d.device_type === "light").length} lights`, color: "text-amber" },
            { label: "WiZ Devices", value: String(devices.filter((d) => d.brand === "wiz").length), sub: `${devices.filter((d) => d.brand === "wiz" && d.online).length} reachable`, color: "text-primary" },
            { label: "Rooms", value: String(new Set(devices.map((d) => d.room)).size), sub: "configured", color: "text-cyan" },
          ].map((m) => (
            <div key={m.label} className="glass-card-hover p-4">
              <div className="text-xs text-muted-foreground mb-2">{m.label}</div>
              <div className={`font-mono text-xl font-semibold ${m.color}`}>{m.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
            </div>
          ))}
        </motion.div>

        {/* Tab switcher */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="bg-secondary/50 p-1.5 rounded-xl flex items-center w-full sm:w-auto relative">
            {(["smart", "network"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "relative flex-1 sm:flex-initial px-6 py-2 rounded-lg text-sm font-medium transition-colors z-10",
                  tab === t ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === t && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary rounded-lg shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">
                  {t === "smart" ? "Smart Home" : "Network"}
                  <span className="ml-1.5 opacity-60 font-mono text-xs">
                    {t === "smart" ? onlineSmartCount : onlineNetCount}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === "smart" ? (
            <motion.div
              key="smart"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {loading ? (
                <div className="glass-card p-8 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading devices...</span>
                </div>
              ) : devices.length === 0 ? (
                <div className="glass-card p-8 text-center space-y-3">
                  <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No smart devices registered yet.</p>
                  <p className="text-xs text-muted-foreground">Click Manage then Add Device or Discover WiZ to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {devices.map((device) => {
                    const Icon = SMART_TYPE_ICONS[device.device_type] || Lightbulb;
                    const isOn = device.state?.on;
                    return (
                      <motion.div
                        key={device.id}
                        layout
                        className={`glass-card-hover sm:p-4 p-3 transition-all relative group ${!device.online ? "opacity-50" : ""}`}
                      >
                        {/* Manage overlay */}
                        {manageMode && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute top-2 right-2 flex items-center gap-1 z-10"
                          >
                            <button
                              onClick={() => pollDeviceState(device.id)}
                              className="p-1.5 rounded-md bg-cyan/10 text-cyan hover:bg-cyan/20 transition-colors"
                              title="Refresh state"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => openEditSmart(device)}
                              className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: device.id, kind: "smart" })}
                              className="p-1.5 rounded-md bg-crimson/10 text-crimson hover:bg-crimson/20 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}

                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 sm:p-2 rounded-lg ${isOn ? "bg-primary/10" : "bg-secondary"}`}>
                              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isOn ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-medium text-foreground">{device.name}</div>
                              <div className="text-[10px] sm:text-xs text-muted-foreground">{device.room}</div>
                            </div>
                          </div>
                          {!manageMode && (
                            <span className={`w-2 h-2 rounded-full mt-1.5 ${device.online ? "bg-emerald pulse-dot" : "bg-muted-foreground"}`} />
                          )}
                        </div>

                        {/* Brand & model */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
                            {device.brand}
                          </span>
                          {device.model && (
                            <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
                              {device.model}
                            </span>
                          )}
                        </div>

                        {/* IP & MAC (desktop only) */}
                        <div className="hidden sm:block text-[10px] font-mono text-muted-foreground space-y-0.5 mb-3">
                          <div>IP: {device.ip}</div>
                          {device.mac && <div>MAC: {device.mac}</div>}
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
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-crimson/10 border border-crimson/20 mb-2">
                                <WifiOff className="w-3.5 h-3.5 text-crimson shrink-0" />
                                <span className="text-[11px] text-crimson">{deviceErrors[device.id]}</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Device controls */}
                        {device.device_type === "light" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Power</span>
                              <div className="flex items-center gap-1.5">
                                {busyDevices.has(device.id) && (
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                )}
                                <button onClick={() => toggleDevice(device)} disabled={busyDevices.has(device.id)} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                                {isOn ? (
                                  <ToggleRight className="w-6 h-6 text-emerald" />
                                ) : (
                                  <ToggleLeft className="w-6 h-6" />
                                )}
                              </button>
                              </div>
                            </div>
                            {isOn && device.state?.brightness != null && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Brightness</span>
                                <span className="font-mono text-xs text-foreground">{device.state.brightness}%</span>
                              </div>
                            )}
                            {isOn && device.state?.color_temp != null && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Color Temp</span>
                                <span className="font-mono text-xs text-foreground">{device.state.color_temp}K</span>
                              </div>
                            )}
                            {isOn && device.state?.scene_name && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Scene</span>
                                <span className="status-badge bg-primary/10 text-primary text-[10px]">{device.state.scene_name}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {device.device_type === "thermostat" && device.online && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Current</span>
                              <span className="font-mono text-sm text-foreground">{device.state?.temp ?? "—"}°C</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Target</span>
                              <span className="font-mono text-sm text-emerald">{device.state?.target ?? "—"}°C</span>
                            </div>
                          </div>
                        )}

                        {device.device_type === "camera" && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Status</span>
                            <span className={`status-badge text-[10px] ${device.online ? "bg-emerald/10 text-emerald" : "bg-secondary text-muted-foreground"}`}>
                              {device.online ? "● Recording" : "Offline"}
                            </span>
                          </div>
                        )}

                        {!device.online && (
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-0">
                            <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Offline</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="network"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass-card-hover overflow-hidden"
            >
              <div className={`grid gap-2 px-5 py-3 border-b border-border text-xs text-muted-foreground font-medium ${
                manageMode ? "grid-cols-[1fr_120px_160px_100px_80px_70px]" : "grid-cols-[1fr_120px_160px_100px_80px]"
              }`}>
                <span>Device</span>
                <span>IP Address</span>
                <span>MAC Address</span>
                <span>Bandwidth</span>
                <span>Status</span>
                {manageMode && <span>Actions</span>}
              </div>
              {networkDevices.map((device, i) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`grid gap-2 px-5 py-3 items-center border-b border-border/50 hover:bg-secondary/30 transition-colors ${
                    manageMode ? "grid-cols-[1fr_120px_160px_100px_80px_70px]" : "grid-cols-[1fr_120px_160px_100px_80px]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${device.online ? "bg-emerald pulse-dot" : "bg-muted-foreground"}`} />
                    <device.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{device.name}</div>
                      <div className="text-[10px] text-muted-foreground">{device.type}</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-foreground">{device.ip}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{device.mac}</span>
                  <span className="font-mono text-xs text-foreground">{device.bandwidth}</span>
                  <span className={`status-badge text-[10px] ${device.online ? "bg-emerald/10 text-emerald" : "bg-secondary text-muted-foreground"}`}>
                    {device.online ? "ONLINE" : "OFFLINE"}
                  </span>
                  {manageMode && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditNet(device)}
                        className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: device.id, kind: "network" })}
                        className="p-1.5 rounded-md bg-crimson/10 text-crimson hover:bg-crimson/20 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Smart Device Add/Edit Dialog */}
      <Dialog open={smartDialogOpen} onOpenChange={setSmartDialogOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-md p-5 sm:p-6 overflow-hidden max-w-[92vw] sm:rounded-2xl">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              {editingDevice ? "Edit Smart Device" : "Add Smart Device"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-[11px] font-medium tracking-wide flex items-center gap-1.5">
                Device Name
              </Label>
              <Input
                value={smartForm.name}
                onChange={(e) => setSmartForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Dining Room Light"
                className="bg-secondary/50 border-border h-9 text-sm focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium tracking-wide">Room / Location</Label>
                <Input
                  value={smartForm.room}
                  onChange={(e) => setSmartForm((f) => ({ ...f, room: e.target.value }))}
                  placeholder="e.g. Dining Room"
                  className="bg-secondary/50 border-border h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium tracking-wide">IP Address</Label>
                <Input
                  value={smartForm.ip}
                  onChange={(e) => setSmartForm((f) => ({ ...f, ip: e.target.value }))}
                  placeholder="192.168.1.150"
                  className="bg-secondary/50 border-border h-9 font-mono text-[11px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium tracking-wide">Brand</Label>
                <Select value={smartForm.brand} onValueChange={(v) => setSmartForm((f) => ({ ...f, brand: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wiz">WiZ</SelectItem>
                    <SelectItem value="tuya">Tuya</SelectItem>
                    <SelectItem value="hue">Philips Hue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium tracking-wide">Type</Label>
                <Select value={smartForm.device_type} onValueChange={(v) => setSmartForm((f) => ({ ...f, device_type: v }))}>
                  <SelectTrigger className="bg-secondary/50 border-border h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="thermostat">Thermostat</SelectItem>
                    <SelectItem value="camera">Camera</SelectItem>
                    <SelectItem value="speaker">Speaker</SelectItem>
                    <SelectItem value="sensor">Sensor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium tracking-wide">Model (optional)</Label>
                <Input
                  value={smartForm.model}
                  onChange={(e) => setSmartForm((f) => ({ ...f, model: e.target.value }))}
                  placeholder="e.g. WiZ A60"
                  className="bg-secondary/50 border-border h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium tracking-wide">MAC (optional)</Label>
                <Input
                  value={smartForm.mac}
                  onChange={(e) => setSmartForm((f) => ({ ...f, mac: e.target.value }))}
                  placeholder="AA:BB:CC..."
                  className="bg-secondary/50 border-border h-9 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/50">
            <button
              onClick={() => setSmartDialogOpen(false)}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all font-medium border border-border"
            >
              Cancel
            </button>
            <button
              onClick={saveSmart}
              disabled={!smartForm.name.trim() || !smartForm.ip.trim()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-[0_0_15px_-5px_hsl(var(--primary)/0.4)] transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {editingDevice ? "Save Changes" : "Add Device"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Network Device Add/Edit Dialog */}
      <Dialog open={netDialogOpen} onOpenChange={setNetDialogOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-md p-5 sm:p-6 overflow-hidden max-w-[92vw] sm:rounded-2xl">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
              {editingNetDevice ? "Edit Network Device" : "Add Network Device"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-[11px] font-medium tracking-wide">Device Name</Label>
              <Input
                value={netForm.name}
                onChange={(e) => setNetForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. My Laptop"
                className="bg-secondary/50 border-border h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium tracking-wide">IP Address</Label>
                <Input
                  value={netForm.ip}
                  onChange={(e) => setNetForm((f) => ({ ...f, ip: e.target.value }))}
                  placeholder="192.168.1.100"
                  className="bg-secondary/50 border-border h-9 font-mono text-[11px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium tracking-wide">MAC Address</Label>
                <Input
                  value={netForm.mac}
                  onChange={(e) => setNetForm((f) => ({ ...f, mac: e.target.value }))}
                  placeholder="AA:BB:CC..."
                  className="bg-secondary/50 border-border h-9 font-mono text-[11px]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-[11px] font-medium tracking-wide">Type</Label>
              <Select value={netForm.type} onValueChange={(v) => setNetForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-secondary/50 border-border h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Computer">Computer</SelectItem>
                  <SelectItem value="Phone">Phone</SelectItem>
                  <SelectItem value="Tablet">Tablet</SelectItem>
                  <SelectItem value="NAS">NAS</SelectItem>
                  <SelectItem value="Server">Server</SelectItem>
                  <SelectItem value="Display">Display</SelectItem>
                  <SelectItem value="Access Point">Access Point</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setNetDialogOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveNet}
              disabled={!netForm.name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {editingNetDevice ? "Save" : "Add"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-popover border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Device</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this device? This action cannot be undone.
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (deleteTarget?.kind === "smart") deleteSmart(deleteTarget.id as number);
                else if (deleteTarget?.kind === "network") deleteNet(deleteTarget.id as string);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crimson text-primary-foreground text-sm font-medium hover:bg-crimson/90 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discover Results Dialog */}
      <Dialog open={discoverDialogOpen} onOpenChange={setDiscoverDialogOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Search className="w-4 h-4" />
              WiZ Discovery Results
            </DialogTitle>
          </DialogHeader>
          {discoverResult && discoverResult.count === 0 ? (
            <div className="py-6 text-center space-y-2">
              <WifiOff className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">No WiZ devices found</p>
              <p className="text-xs text-muted-foreground">
                Make sure your WiZ bulbs are powered on and connected to the same network as the server.
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <p className="text-xs text-muted-foreground">
                Found {discoverResult?.count} device{discoverResult?.count !== 1 ? "s" : ""} on the network:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {discoverResult?.discovered.map((bulb) => (
                  <div
                    key={bulb.ip}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      bulb.registered
                        ? "bg-emerald/5 border border-emerald/20"
                        : "bg-secondary/50 border border-border"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Lightbulb className={`w-4 h-4 ${bulb.registered ? "text-emerald" : "text-amber"}`} />
                        <span className="text-sm font-mono text-foreground">{bulb.ip}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground space-x-3 pl-6">
                        {bulb.mac && <span>MAC: {bulb.mac}</span>}
                        {bulb.module && <span>{bulb.module}</span>}
                      </div>
                    </div>
                    {bulb.registered ? (
                      <span className="text-[10px] font-medium text-emerald bg-emerald/10 px-2 py-0.5 rounded-full">
                        Registered
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSmartForm({
                            name: bulb.module || "WiZ Light",
                            room: "",
                            device_type: "light",
                            brand: "wiz",
                            model: bulb.module || "",
                            ip: bulb.ip,
                            mac: bulb.mac || "",
                          });
                          setEditingDevice(null);
                          setDiscoverDialogOpen(false);
                          setSmartDialogOpen(true);
                        }}
                        className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setDiscoverDialogOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
