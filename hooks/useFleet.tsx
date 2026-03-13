import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

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

const generateNodeMetrics = (node: Partial<FleetNode>): FleetNode => {
  const base = node as FleetNode;
  return {
    ...base,
    cpu: {
      ...base.cpu,
      usage: Array.from({ length: base.cpu.cores }, () => 10 + Math.random() * 75),
      temp: (base.type === "macbook" ? 55 : 40) + Math.random() * 38,
    },
    ram: {
      ...base.ram,
      used: base.ram.total * (0.4 + Math.random() * 0.45),
      wired: base.ram.total * (0.1 + Math.random() * 0.15),
    },
    ai: {
      ...base.ai,
      status: Math.random() > 0.3 ? "inferring" : "idle",
      tps: 5 + Math.random() * 15,
      contextUsed: Math.floor(1000 + Math.random() * 7000),
    },
    network: {
      ...base.network,
      wifiSignal: -(30 + Math.random() * 35),
      ports: base.network.ports.map(p => ({ ...p, open: Math.random() > 0.15 })),
      sshAttempts: [
        { ip: "192.168.1.42", timestamp: new Date(Date.now() - 120000).toISOString(), success: true },
        { ip: "10.0.0.15", timestamp: new Date(Date.now() - 300000).toISOString(), success: true },
        { ip: "45.33.32.156", timestamp: new Date(Date.now() - 600000).toISOString(), success: false },
        { ip: "192.168.1.100", timestamp: new Date(Date.now() - 900000).toISOString(), success: true },
      ],
      bandwidth: { up: 2 + Math.random() * 10, down: 5 + Math.random() * 50 },
    },
    logs: [
      `[INFO] ${new Date().toISOString().slice(11, 19)} 200 GET /api/v1/status`,
      `[INFO] ${new Date().toISOString().slice(11, 19)} 200 POST /api/telemetry`,
      `[DEBUG] ${new Date().toISOString().slice(11, 19)} CPU temp: ${(55 + Math.random() * 35).toFixed(1)}°C`,
      `[WARN] ${new Date().toISOString().slice(11, 19)} Memory pressure: moderate`,
      `[INFO] ${new Date().toISOString().slice(11, 19)} 200 GET /api/v1/inference/status`,
    ],
  };
};

const FLEET_NODES_TEMPLATE: Partial<FleetNode>[] = [
  {
    id: "node-01",
    name: "MBA-2020",
    type: "macbook",
    status: "online",
    tailscaleIp: "100.64.0.1",
    location: "Office Desk",
    cpu: { cores: 4, model: "Intel Core i7-1060NG7", usage: [], temp: 0 },
    ram: { total: 16, used: 0, wired: 0 },
    storage: { total: 500, system: 45, ai: 128, available: 327 },
    ai: {
      status: "inferring",
      model: "Mistral-7B-v0.3-Q4_K_M.gguf",
      tps: 0,
      contextUsed: 0,
      contextMax: 8192,
      backend: "cpu",
      models: [
        { name: "Mistral-7B-v0.3-Q4_K_M.gguf", size: "4.1 GB", quantization: "Q4_K_M" },
        { name: "Llama-3-8B-Q3_K_S.gguf", size: "3.6 GB", quantization: "Q3_K_S" },
        { name: "Phi-3-mini-Q5_K_M.gguf", size: "2.8 GB", quantization: "Q5_K_M" },
        { name: "TinyLlama-1.1B-Q8_0.gguf", size: "1.1 GB", quantization: "Q8_0" },
      ],
    },
    network: {
      wifiSignal: -38,
      ports: [
        { port: 22, service: "SSH", open: true },
        { port: 8080, service: "API Gateway", open: true },
        { port: 8081, service: "llama.cpp", open: true },
        { port: 3000, service: "Monitoring", open: true },
      ],
      sshAttempts: [],
      bandwidth: { up: 0, down: 0 },
    },
    logs: [],
  },
  {
    id: "node-02",
    name: "Pi-Cluster-01",
    type: "raspberry-pi",
    status: "online",
    tailscaleIp: "100.64.0.2",
    location: "Server Rack",
    cpu: { cores: 4, model: "ARM Cortex-A72 (BCM2711)", usage: [], temp: 0 },
    ram: { total: 8, used: 0, wired: 0 },
    storage: { total: 128, system: 12, ai: 32, available: 84 },
    ai: {
      status: "idle",
      model: "TinyLlama-1.1B-Q8_0.gguf",
      tps: 0,
      contextUsed: 0,
      contextMax: 2048,
      backend: "cpu",
      models: [
        { name: "TinyLlama-1.1B-Q8_0.gguf", size: "1.1 GB", quantization: "Q8_0" },
      ],
    },
    network: {
      wifiSignal: -55,
      ports: [
        { port: 22, service: "SSH", open: true },
        { port: 8080, service: "API", open: true },
      ],
      sshAttempts: [],
      bandwidth: { up: 0, down: 0 },
    },
    logs: [],
  },
  {
    id: "node-03",
    name: "Cloud-VPS",
    type: "cloud-vps",
    status: "degraded",
    tailscaleIp: "100.64.0.3",
    location: "US-East (Virginia)",
    cpu: { cores: 2, model: "AMD EPYC 7543P", usage: [], temp: 0 },
    ram: { total: 4, used: 0, wired: 0 },
    storage: { total: 80, system: 15, ai: 0, available: 65 },
    ai: {
      status: "idle",
      model: "—",
      tps: 0,
      contextUsed: 0,
      contextMax: 0,
      backend: "cpu",
      models: [],
    },
    network: {
      wifiSignal: -20,
      ports: [
        { port: 22, service: "SSH", open: true },
        { port: 443, service: "HTTPS", open: true },
        { port: 80, service: "HTTP", open: true },
      ],
      sshAttempts: [],
      bandwidth: { up: 0, down: 0 },
    },
    logs: [],
  },
];

interface FleetContextType {
  nodes: FleetNode[];
  activeNodeId: string;
  activeNode: FleetNode;
  setActiveNodeId: (id: string) => void;
  agentFeed: FleetAgentLog[];
  aggregated: {
    totalRam: number;
    totalStorage: number;
    activeAiInstances: number;
    onlineNodes: number;
    totalNodes: number;
  };
  loadBalancerEnabled: boolean;
  setLoadBalancerEnabled: (v: boolean) => void;
}

const FleetContext = createContext<FleetContextType | null>(null);

export function useFleet() {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used within FleetProvider");
  return ctx;
}

export function FleetProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<FleetNode[]>(
    FLEET_NODES_TEMPLATE.map(n => generateNodeMetrics(n))
  );
  const [activeNodeId, setActiveNodeId] = useState("node-01");
  const [agentFeed, setAgentFeed] = useState<FleetAgentLog[]>([]);
  const [loadBalancerEnabled, setLoadBalancerEnabled] = useState(false);

  const refresh = useCallback(() => {
    setNodes(prev =>
      prev.map(n => ({
        ...generateNodeMetrics(FLEET_NODES_TEMPLATE.find(t => t.id === n.id)!),
        status: n.id === "node-03" ? (Math.random() > 0.7 ? "online" : "degraded") : n.status,
      }))
    );

    // Agent feed log
    const nodeNames = ["MBA-2020", "Pi-Cluster-01", "Cloud-VPS"];
    const nodeIds = ["node-01", "node-02", "node-03"];
    const idx = Math.floor(Math.random() * 3);
    const messages = [
      "Pulse Received",
      "Heartbeat OK",
      "Metrics Synced",
      "CPU Spike Detected",
      "Memory Pressure Warning",
      "Connection Established",
    ];
    const types: FleetAgentLog["type"][] = ["pulse", "pulse", "info", "warning", "warning", "info"];
    const msgIdx = Math.floor(Math.random() * messages.length);

    setAgentFeed(prev => [
      ...prev.slice(-50),
      {
        nodeId: nodeIds[idx],
        nodeName: nodeNames[idx],
        message: messages[msgIdx],
        timestamp: new Date().toISOString(),
        type: types[msgIdx],
      },
    ]);
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 2500);
    return () => clearInterval(interval);
  }, [refresh]);

  const activeNode = nodes.find(n => n.id === activeNodeId) || nodes[0];

  const aggregated = {
    totalRam: nodes.reduce((a, n) => a + n.ram.total, 0),
    totalStorage: nodes.reduce((a, n) => a + n.storage.total, 0),
    activeAiInstances: nodes.filter(n => n.ai.status === "inferring").length,
    onlineNodes: nodes.filter(n => n.status !== "offline").length,
    totalNodes: nodes.length,
  };

  return (
    <FleetContext.Provider
      value={{
        nodes,
        activeNodeId,
        activeNode,
        setActiveNodeId,
        agentFeed,
        aggregated,
        loadBalancerEnabled,
        setLoadBalancerEnabled,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
}
