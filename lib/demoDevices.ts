// Sample/demo data for the Smart Home and Network pages.
// Rendered only when the real backend list is empty, and always
// labeled clearly so users do not mistake them for real devices.

export interface DemoSmartDevice {
  id: string;
  name: string;
  room: string;
  device_type: "light" | "thermostat" | "camera" | "speaker" | "sensor";
  brand: string;
  model: string;
  state: Record<string, unknown>;
}

export const DEMO_SMART_DEVICES: DemoSmartDevice[] = [
  {
    id: "demo-1",
    name: "Living Room Light",
    room: "Living Room",
    device_type: "light",
    brand: "wiz",
    model: "WiZ A60 Color",
    state: { on: true, brightness: 80, color_temp: 3000 },
  },
  {
    id: "demo-2",
    name: "Bedroom Light",
    room: "Bedroom",
    device_type: "light",
    brand: "wiz",
    model: "WiZ A19",
    state: { on: false, brightness: 60 },
  },
  {
    id: "demo-3",
    name: "Kitchen Light",
    room: "Kitchen",
    device_type: "light",
    brand: "wiz",
    model: "WiZ BR30",
    state: { on: true, brightness: 100, scene_id: 12, scene_name: "Daylight" },
  },
  {
    id: "demo-4",
    name: "Desk Lamp",
    room: "Office",
    device_type: "light",
    brand: "wiz",
    model: "WiZ Color",
    state: { on: true, r: 255, g: 150, b: 100, brightness: 45 },
  },
  {
    id: "demo-5",
    name: "Hallway Light",
    room: "Hallway",
    device_type: "light",
    brand: "wiz",
    model: "WiZ",
    state: { on: false, brightness: 70 },
  },
  {
    id: "demo-6",
    name: "Reading Light",
    room: "Bedroom",
    device_type: "light",
    brand: "wiz",
    model: "WiZ A60",
    state: { on: true, brightness: 30, color_temp: 2700 },
  },
];

