import { create } from "zustand";

export interface FleetNode {
  id: string;
  name: string;
  type: "macbook" | "raspberry-pi" | "cloud-vps" | "server";
  status: "online" | "offline" | "degraded";
  tailscaleIp: string;
  location: string;
  cpu: { cores: number; model: string; usage: number[]; temp: number };
  ram: { total: number; used: number; wired: number };
  storage: { total: number; system: number; ai: number; available: number };
  ai: {
    status: "idle" | "inferring" | "loading";
    model: string;
    tps: number;
    contextUsed: number;
    contextMax: number;
    backend: "cpu" | "gpu";
    models: { name: string; size: string; quantization: string }[];
  };
  network: {
    wifiSignal: number;
    ports: { port: number; service: string; open: boolean }[];
    sshAttempts: { ip: string; timestamp: string; success: boolean }[];
    bandwidth: { up: number; down: number };
  };
  logs: string[];
}

export interface FleetAgentLog {
  nodeId: string;
  nodeName: string;
  message: string;
  timestamp: string;
  type: "pulse" | "warning" | "error" | "info";
}

// Helper for generating initial metrics
const generateMetrics = (node: any, isInitial = false): FleetNode => {
  const base = node as FleetNode;
  return {
    ...base,
    cpu: { 
      cores: base.cpu?.cores || 4,
      model: base.cpu?.model || "Unknown",
      usage: Array.from({ length: base.cpu?.cores || 4 }, () => isInitial ? 45 : 10 + Math.random() * 75), 
      temp: isInitial ? 42 : 50 + Math.random() * 20 
    },
    ram: { 
      total: base.ram?.total || 16, 
      used: (base.ram?.total || 16) * 0.4, 
      wired: (base.ram?.total || 16) * 0.1 
    },
    storage: base.storage || { total: 500, system: 45, ai: 128, available: 327 },
    ai: { 
      ...base.ai, 
      status: base.ai?.status || "idle", 
      tps: base.ai?.tps || 0, 
      contextUsed: base.ai?.contextUsed || 0,
      contextMax: base.ai?.contextMax || 8192,
      backend: base.ai?.backend || "cpu",
      models: base.ai?.models || []
    },
    network: { 
      ...base.network, 
      wifiSignal: base.network?.wifiSignal || -50, 
      ports: base.network?.ports?.map((p: any) => ({ ...p, open: true })) || [], 
      sshAttempts: base.network?.sshAttempts || [
        { ip: "192.168.1.42", timestamp: "2024-03-12T10:00:00Z", success: true },
        { ip: "10.0.0.15", timestamp: "2024-03-12T10:05:00Z", success: true },
      ],
      bandwidth: base.network?.bandwidth || { up: 0, down: 0 } 
    },
    logs: base.logs || [],
    status: base.status || "online",
    tailscaleIp: base.tailscaleIp || "100.64.0.1",
    location: base.location || "Default",
    name: base.name || "Unknown Node",
    id: base.id || "unknown"
  };
};

const FLEET_NODES_TEMPLATE: any[] = [
  {
    id: "node-01",
    name: "MBA-2020",
    type: "macbook",
    status: "online",
    tailscaleIp: "100.64.0.1",
    location: "Office Desk",
    cpu: { cores: 4, model: "Intel Core i7-1060NG7" },
    ram: { total: 16 },
    storage: { total: 500, system: 45, ai: 128, available: 327 },
    ai: {
      status: "inferring",
      model: "Mistral-7B-v0.3-Q4_K_M.gguf",
      contextMax: 8192,
      backend: "cpu",
      models: [
        { name: "Mistral-7B-v0.3-Q4_K_M.gguf", size: "4.1 GB", quantization: "Q4_K_M" },
      ],
    },
    network: {
      wifiSignal: -38,
      ports: [
        { port: 22, service: "SSH" },
        { port: 8080, service: "API Gateway" },
      ],
    },
  },
  {
    id: "node-02",
    name: "Pi-Cluster-01",
    type: "raspberry-pi",
    status: "online",
    tailscaleIp: "100.64.0.2",
    location: "Server Rack",
    cpu: { cores: 4, model: "ARM Cortex-A72 (BCM2711)" },
    ram: { total: 8 },
    storage: { total: 128, system: 12, ai: 32, available: 84 },
    ai: {
      status: "idle",
      model: "TinyLlama-1.1B-Q8_0.gguf",
      contextMax: 2048,
      backend: "cpu",
      models: [],
    },
    network: {
      wifiSignal: -55,
      ports: [{ port: 22, service: "SSH" }],
    },
  },
  {
    id: "node-03",
    name: "Cloud-VPS",
    type: "cloud-vps",
    status: "degraded",
    tailscaleIp: "100.64.0.3",
    location: "US-East (Virginia)",
    cpu: { cores: 2, model: "AMD EPYC 7543P" },
    ram: { total: 4 },
    storage: { total: 80, system: 15, ai: 0, available: 65 },
    ai: { status: "idle", model: "—", contextMax: 0, backend: "cpu", models: [] },
    network: { wifiSignal: -20, ports: [{ port: 22, service: "SSH" }] },
  },
];

interface FleetState {
  nodes: FleetNode[];
  activeNodeId: string;
  agentFeed: FleetAgentLog[];
  loadBalancerEnabled: boolean;
  setActiveNodeId: (id: string) => void;
  setLoadBalancerEnabled: (v: boolean) => void;
  updateNodes: (nodes: FleetNode[]) => void;
  addLog: (log: FleetAgentLog) => void;
  refresh: () => void;
}

export const useFleetStore = create<FleetState>((set) => ({
  nodes: FLEET_NODES_TEMPLATE.map(n => generateMetrics(n, true)),
  activeNodeId: "node-01",
  agentFeed: [],
  loadBalancerEnabled: false,
  setActiveNodeId: (id) => set({ activeNodeId: id }),
  setLoadBalancerEnabled: (v) => set({ loadBalancerEnabled: v }),
  updateNodes: (nodes) => set({ nodes }),
  addLog: (log) => set((state) => ({ agentFeed: [...state.agentFeed.slice(-50), log] })),
  refresh: () => set((state) => ({
    nodes: state.nodes.map(n => generateMetrics(n))
  }))
}));

// Selectors for convenience
export const useActiveNode = () => {
  const { nodes, activeNodeId } = useFleetStore();
  return nodes.find((n) => n.id === activeNodeId) || nodes[0];
};

export const useAggregatedStats = () => {
  const { nodes } = useFleetStore();
  return {
    totalRam: nodes.reduce((a, n) => a + n.ram.total, 0),
    totalStorage: nodes.reduce((a, n) => a + n.storage.total, 0),
    activeAiInstances: nodes.filter((n) => n.ai.status === "inferring").length,
    onlineNodes: nodes.filter((n) => n.status !== "offline").length,
    totalNodes: nodes.length,
  };
};
