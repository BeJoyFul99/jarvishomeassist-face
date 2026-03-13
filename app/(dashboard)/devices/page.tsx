"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Lightbulb, Thermometer, Camera, Speaker, WifiOff,
  Laptop, Smartphone, HardDrive, Monitor,
  Signal, Router, Settings as SettingsIcon, Plus, Trash2, Pencil, X, Check,
  ToggleLeft, ToggleRight
} from "lucide-react";
import { useSystemStatus } from "@/hooks/useSystemStatus";
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
  id: string;
  name: string;
  room: string;
  icon: any;
  type: "light" | "thermostat" | "camera" | "speaker" | "sensor";
  online: boolean;
  state: Record<string, any>;
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

const SMART_DEFAULT_STATES: Record<string, Record<string, any>> = {
  light: { on: false, brightness: 80 },
  thermostat: { temp: 21, target: 22, mode: "auto" },
  camera: { recording: false, motion: false },
  speaker: { playing: false, volume: 50 },
  sensor: { open: false, temp: 20 },
};

const INITIAL_SMART_DEVICES: SmartDevice[] = [
  { id: "1", name: "Living Room Lights", room: "Living Room", icon: Lightbulb, type: "light", online: true, state: { on: true, brightness: 80 } },
  { id: "2", name: "Bedroom Lamp", room: "Bedroom", icon: Lightbulb, type: "light", online: true, state: { on: false, brightness: 50 } },
  { id: "3", name: "Kitchen Lights", room: "Kitchen", icon: Lightbulb, type: "light", online: true, state: { on: true, brightness: 100 } },
  { id: "4", name: "Thermostat", room: "Hallway", icon: Thermometer, type: "thermostat", online: true, state: { temp: 22, target: 23, mode: "auto" } },
  { id: "5", name: "Front Door Cam", room: "Entrance", icon: Camera, type: "camera", online: true, state: { recording: true, motion: false } },
  { id: "6", name: "Backyard Cam", room: "Outdoor", icon: Camera, type: "camera", online: false, state: { recording: false, motion: false } },
  { id: "7", name: "Office Speaker", room: "Office", icon: Speaker, type: "speaker", online: true, state: { playing: false, volume: 45 } },
  { id: "8", name: "Garage Sensor", room: "Garage", icon: Signal, type: "sensor", online: true, state: { open: false, temp: 18 } },
];

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
  const { status } = useSystemStatus();
  const [devices, setDevices] = useState(INITIAL_SMART_DEVICES);
  const [networkDevices, setNetworkDevices] = useState(INITIAL_NETWORK_DEVICES);
  const [tab, setTab] = useState<"smart" | "network">("smart");
  const [manageMode, setManageMode] = useState(false);

  // Smart device dialog state
  const [smartDialogOpen, setSmartDialogOpen] = useState(false);
  const [editingSmartDevice, setEditingSmartDevice] = useState<SmartDevice | null>(null);
  const [smartForm, setSmartForm] = useState({ name: "", room: "", type: "light" as SmartDevice["type"] });

  // Network device dialog state
  const [netDialogOpen, setNetDialogOpen] = useState(false);
  const [editingNetDevice, setEditingNetDevice] = useState<NetworkDevice | null>(null);
  const [netForm, setNetForm] = useState({ name: "", ip: "", mac: "", type: "Computer" });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: "smart" | "network" } | null>(null);

  const toggleDevice = (id: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, state: { ...d.state, on: !d.state.on } } : d
      )
    );
  };

  // Smart device CRUD
  const openAddSmart = () => {
    setEditingSmartDevice(null);
    setSmartForm({ name: "", room: "", type: "light" });
    setSmartDialogOpen(true);
  };

  const openEditSmart = (device: SmartDevice) => {
    setEditingSmartDevice(device);
    setSmartForm({ name: device.name, room: device.room, type: device.type });
    setSmartDialogOpen(true);
  };

  const saveSmart = () => {
    if (!smartForm.name.trim()) return;
    if (editingSmartDevice) {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === editingSmartDevice.id
            ? { ...d, name: smartForm.name, room: smartForm.room, type: smartForm.type, icon: SMART_TYPE_ICONS[smartForm.type] }
            : d
        )
      );
    } else {
      const newDevice: SmartDevice = {
        id: `smart-${Date.now()}`,
        name: smartForm.name,
        room: smartForm.room,
        type: smartForm.type,
        icon: SMART_TYPE_ICONS[smartForm.type],
        online: true,
        state: { ...SMART_DEFAULT_STATES[smartForm.type] },
      };
      setDevices((prev) => [...prev, newDevice]);
    }
    setSmartDialogOpen(false);
  };

  const deleteSmart = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setDeleteTarget(null);
  };

  // Network device CRUD
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
        <motion.div variants={item} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Home Devices</h1>
              <p className="text-sm text-muted-foreground">Smart home controls & network inventory</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {manageMode && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => tab === "smart" ? openAddSmart() : openAddNet()}
                className="flex items-center gap-2 rounded-lg bg-emerald/10 border border-emerald/20 px-4 py-2 text-sm font-medium text-emerald transition-colors hover:bg-emerald/20"
              >
                <Plus className="w-4 h-4" />
                Add Device
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setManageMode(!manageMode)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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
            { label: "Network Devices", value: `${onlineNetCount}/${networkDevices.length}`, sub: "connected", color: "text-primary" },
            { label: "Wi-Fi Signal", value: `${status.wifi_signal.toFixed(0)} dBm`, sub: status.wifi_signal > -50 ? "Excellent" : "Good", color: "text-amber" },
            { label: "Active Cameras", value: String(devices.filter((d) => d.type === "camera" && d.online).length), sub: "recording", color: "text-crimson" },
          ].map((m) => (
            <div key={m.label} className="glass-card-hover p-4">
              <div className="text-xs text-muted-foreground mb-2">{m.label}</div>
              <div className={`font-mono text-xl font-semibold ${m.color}`}>{m.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
            </div>
          ))}
        </motion.div>

        {/* Tab switcher */}
        <motion.div variants={item} className="flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
          {(["smart", "network"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "smart" ? "Smart Home" : "Network"}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === "smart" ? (
            <motion.div
              key="smart"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
            >
              {devices.map((device) => (
                <motion.div
                  key={device.id}
                  layout
                  className={`glass-card-hover p-4 transition-all relative group ${!device.online ? "opacity-50" : ""}`}
                >
                  {/* Manage overlay */}
                  {manageMode && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute top-2 right-2 flex items-center gap-1 z-10"
                    >
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
                      <div className={`p-2 rounded-lg ${device.state.on || device.state.recording ? "bg-primary/10" : "bg-secondary"}`}>
                        <device.icon className={`w-4 h-4 ${device.state.on || device.state.recording ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{device.name}</div>
                        <div className="text-xs text-muted-foreground">{device.room}</div>
                      </div>
                    </div>
                    {!manageMode && (
                      <span className={`w-2 h-2 rounded-full mt-1.5 ${device.online ? "bg-emerald pulse-dot" : "bg-muted-foreground"}`} />
                    )}
                  </div>

                  {/* Device-specific controls */}
                  {device.type === "light" && device.online && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Power</span>
                        <button onClick={() => toggleDevice(device.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                          {device.state.on ? (
                            <ToggleRight className="w-6 h-6 text-emerald" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>
                      </div>
                      {device.state.on && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Brightness</span>
                          <span className="font-mono text-xs text-foreground">{device.state.brightness}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {device.type === "thermostat" && device.online && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Current</span>
                        <span className="font-mono text-sm text-foreground">{device.state.temp}°C</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Target</span>
                        <span className="font-mono text-sm text-emerald">{device.state.target}°C</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Mode</span>
                        <span className="status-badge bg-primary/10 text-primary text-[10px]">{device.state.mode}</span>
                      </div>
                    </div>
                  )}

                  {device.type === "camera" && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <span className={`status-badge text-[10px] ${device.online ? "bg-emerald/10 text-emerald" : "bg-secondary text-muted-foreground"}`}>
                        {device.online ? "● Recording" : "Offline"}
                      </span>
                    </div>
                  )}

                  {device.type === "speaker" && device.online && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Status</span>
                        <span className="text-xs text-muted-foreground">{device.state.playing ? "Playing" : "Idle"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Volume</span>
                        <span className="font-mono text-xs text-foreground">{device.state.volume}%</span>
                      </div>
                    </div>
                  )}

                  {device.type === "sensor" && device.online && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Door</span>
                        <span className={`status-badge text-[10px] ${device.state.open ? "bg-amber/10 text-amber" : "bg-emerald/10 text-emerald"}`}>
                          {device.state.open ? "OPEN" : "CLOSED"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Temp</span>
                        <span className="font-mono text-xs text-foreground">{device.state.temp}°C</span>
                      </div>
                    </div>
                  )}

                  {!device.online && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <WifiOff className="w-3 h-3" />
                      <span>Device offline</span>
                    </div>
                  )}
                </motion.div>
              ))}
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
        <DialogContent className="bg-popover border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingSmartDevice ? "Edit Smart Device" : "Add Smart Device"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Device Name</Label>
              <Input
                value={smartForm.name}
                onChange={(e) => setSmartForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Living Room Lamp"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Room</Label>
              <Input
                value={smartForm.room}
                onChange={(e) => setSmartForm((f) => ({ ...f, room: e.target.value }))}
                placeholder="e.g. Bedroom"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Type</Label>
              <Select value={smartForm.type} onValueChange={(v) => setSmartForm((f) => ({ ...f, type: v as SmartDevice["type"] }))}>
                <SelectTrigger className="bg-secondary border-border">
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
          <DialogFooter>
            <button
              onClick={() => setSmartDialogOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSmart}
              disabled={!smartForm.name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {editingSmartDevice ? "Save" : "Add"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Network Device Add/Edit Dialog */}
      <Dialog open={netDialogOpen} onOpenChange={setNetDialogOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingNetDevice ? "Edit Network Device" : "Add Network Device"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Device Name</Label>
              <Input
                value={netForm.name}
                onChange={(e) => setNetForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. My Laptop"
                className="bg-secondary border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">IP Address</Label>
                <Input
                  value={netForm.ip}
                  onChange={(e) => setNetForm((f) => ({ ...f, ip: e.target.value }))}
                  placeholder="192.168.1.100"
                  className="bg-secondary border-border font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">MAC Address</Label>
                <Input
                  value={netForm.mac}
                  onChange={(e) => setNetForm((f) => ({ ...f, mac: e.target.value }))}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  className="bg-secondary border-border font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Type</Label>
              <Select value={netForm.type} onValueChange={(v) => setNetForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-secondary border-border">
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
                if (deleteTarget?.kind === "smart") deleteSmart(deleteTarget.id);
                else if (deleteTarget?.kind === "network") deleteNet(deleteTarget.id);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crimson text-primary-foreground text-sm font-medium hover:bg-crimson/90 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
