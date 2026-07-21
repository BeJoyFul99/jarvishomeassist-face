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

export interface DemoNetworkDevice {
  id: string;
  name: string;
  ip: string;
  mac: string;
  type: string;
  online: boolean;
  lastSeen: string;
  bandwidth: string;
}

export const DEMO_NETWORK_DEVICES: DemoNetworkDevice[] = [
  { id: "demo-net-1", name: "MacBook Pro", ip: "192.168.1.42", mac: "A4:83:E7:2B:1C:9F", type: "Computer", online: true, lastSeen: "Now", bandwidth: "12.4 MB/s" },
  { id: "demo-net-2", name: "iPhone 15", ip: "192.168.1.55", mac: "B2:9A:F1:4C:8D:3E", type: "Phone", online: true, lastSeen: "Now", bandwidth: "2.1 MB/s" },
  { id: "demo-net-3", name: "Synology NAS", ip: "192.168.1.10", mac: "00:11:32:AB:CD:EF", type: "NAS", online: true, lastSeen: "Now", bandwidth: "45.2 MB/s" },
  { id: "demo-net-4", name: "Smart TV", ip: "192.168.1.80", mac: "C8:D7:19:5A:2B:FF", type: "Display", online: true, lastSeen: "Now", bandwidth: "8.7 MB/s" },
  { id: "demo-net-5", name: "iPad Air", ip: "192.168.1.63", mac: "D4:E6:B8:3C:9A:12", type: "Tablet", online: false, lastSeen: "2h ago", bandwidth: "—" },
  { id: "demo-net-6", name: "HomeLab Server", ip: "192.168.1.2", mac: "00:25:90:FE:DC:BA", type: "Server", online: true, lastSeen: "Now", bandwidth: "67.8 MB/s" },
  { id: "demo-net-7", name: "Wi-Fi AP (Upstairs)", ip: "192.168.1.3", mac: "F0:9F:C2:1A:5B:77", type: "Access Point", online: true, lastSeen: "Now", bandwidth: "—" },
];
