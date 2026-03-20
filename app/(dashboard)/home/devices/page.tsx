"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Lightbulb,
  Thermometer,
  Video,
  Speaker,
  Sun,
  Moon,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface Device {
  id: string;
  name: string;
  room: string;
  icon: typeof Lightbulb;
  type: "light" | "thermostat" | "camera" | "speaker";
  on: boolean;
  value?: number;
}

const INITIAL_DEVICES: Device[] = [
  { id: "1", name: "Living Room Lights", room: "Living Room", icon: Lightbulb, type: "light", on: true, value: 80 },
  { id: "2", name: "Bedroom Lights", room: "Bedroom", icon: Lightbulb, type: "light", on: false, value: 50 },
  { id: "3", name: "Kitchen Lights", room: "Kitchen", icon: Lightbulb, type: "light", on: true, value: 100 },
  { id: "4", name: "Thermostat", room: "Hallway", icon: Thermometer, type: "thermostat", on: true, value: 71 },
  { id: "5", name: "Front Door Camera", room: "Entrance", icon: Video, type: "camera", on: true },
  { id: "6", name: "Living Room Speaker", room: "Living Room", icon: Speaker, type: "speaker", on: false, value: 40 },
];

const HomeDevicesPage = () => {
  const [devices, setDevices] = useState(INITIAL_DEVICES);

  const toggle = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, on: !d.on } : d)),
    );
  };

  const setValue = (id: string, val: number) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, value: val } : d)),
    );
  };

  const rooms = [...new Set(devices.map((d) => d.room))];

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
            {devices.filter((d) => d.on).length} devices active
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              setDevices((prev) =>
                prev.map((d) =>
                  d.type === "light" ? { ...d, on: true } : d,
                ),
              )
            }
            className="px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Sun className="w-3.5 h-3.5 text-amber" /> All Lights On
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              setDevices((prev) =>
                prev.map((d) =>
                  d.type === "light" ? { ...d, on: false } : d,
                ),
              )
            }
            className="px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Moon className="w-3.5 h-3.5 text-cyan" /> All Lights Off
          </motion.button>
        </div>
      </motion.div>

      {rooms.map((room) => (
        <motion.div key={room} variants={item} className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {room}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {devices
              .filter((d) => d.room === room)
              .map((device) => (
                <motion.div
                  key={device.id}
                  variants={item}
                  className={`glass-card p-4 space-y-3 transition-colors ${device.on ? "border-primary/20" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${device.on ? "bg-primary/10" : "bg-secondary"}`}
                      >
                        <device.icon
                          className={`w-4 h-4 ${device.on ? "text-primary" : "text-muted-foreground"}`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {device.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {device.on
                            ? device.type === "thermostat"
                              ? `${device.value}°F`
                              : device.type === "light"
                                ? `${device.value}% brightness`
                                : device.type === "camera"
                                  ? "Recording"
                                  : device.type === "speaker"
                                    ? `Volume ${device.value}%`
                                    : "On"
                            : "Off"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={device.on}
                      onCheckedChange={() => toggle(device.id)}
                    />
                  </div>

                  {device.on &&
                    device.value !== undefined &&
                    device.type !== "camera" && (
                      <Slider
                        value={[device.value]}
                        min={device.type === "thermostat" ? 60 : 0}
                        max={device.type === "thermostat" ? 85 : 100}
                        step={1}
                        onValueChange={([v]) => setValue(device.id, v)}
                        className="py-1"
                      />
                    )}
                </motion.div>
              ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default HomeDevicesPage;
