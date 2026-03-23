import { create } from "zustand";

export interface FleetNode {
  id: string;
  name: string;
  type: "macbook" | "raspberry-pi" | "cloud-vps" | "server";
  status: "online" | "offline" | "degraded";
  tailscaleIp: string;
  location: string;
  port: number;
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
const generateMetrics = (node: FleetNode, isInitial = false): FleetNode => {
  const base = node;
  return {
    ...base,
    cpu: {
      cores: base.cpu?.cores || 4,
      model: base.cpu?.model || "Unknown",
      usage: Array.from({ length: base.cpu?.cores || 4 }, () =>
        isInitial ? 45 : 10 + Math.random() * 75,
      ),
      temp: isInitial ? 42 : 50 + Math.random() * 20,
    },
    ram: {
      total: base.ram?.total || 16,
      used: (base.ram?.total || 16) * 0.4,
      wired: (base.ram?.total || 16) * 0.1,
    },
    storage: base.storage || {
      total: 500,
      system: 45,
      ai: 128,
      available: 327,
    },
    ai: {
      ...base.ai,
      status: base.ai?.status || "idle",
      tps: base.ai?.tps || 0,
      contextUsed: base.ai?.contextUsed || 0,
      contextMax: base.ai?.contextMax || 8192,
      backend: base.ai?.backend || "cpu",
      models: base.ai?.models || [],
    },
    network: {
      ...base.network,
      wifiSignal: base.network?.wifiSignal || -50,
      ports:
        base.network?.ports?.map(
          (p: { port: number; service: string; open: boolean }) => ({
            ...p,
            open: true,
          }),
        ) || [],
      sshAttempts: base.network?.sshAttempts || [
        {
          ip: "192.168.1.42",
          timestamp: "2024-03-12T10:00:00Z",
          success: true,
        },
        { ip: "10.0.0.15", timestamp: "2024-03-12T10:05:00Z", success: true },
      ],
      bandwidth: base.network?.bandwidth || { up: 0, down: 0 },
    },
    logs: base.logs || [],
    status: base.status || "online",
    tailscaleIp: base.tailscaleIp || "100.64.0.1",
    location: base.location || "Default",
    name: base.name || "Unknown Node",
    id: base.id || "unknown",
  };
};

const FLEET_NODES_TEMPLATE: FleetNode[] = [
  {
    id: "node-01",
    name: "MBA-2020",
    type: "macbook",
    status: "online",
    tailscaleIp: "100.64.0.1",
    location: "Office Desk",
    cpu: {
      cores: 4,
      model: "Intel Core i7-1060NG7",
      usage: [],
      temp: 0,
    },
    ram: {
      total: 16,
      used: 0,
      wired: 0,
    },
    storage: { total: 500, system: 45, ai: 128, available: 327 },
    ai: {
      status: "inferring",
      model: "Mistral-7B-v0.3-Q4_K_M.gguf",
      contextMax: 8192,
      backend: "cpu",
      models: [
        {
          name: "Mistral-7B-v0.3-Q4_K_M.gguf",
          size: "4.1 GB",
          quantization: "Q4_K_M",
        },
        {
          name: "Llama-3-8B-Q3_K_S.gguf",
          size: "3.1 GB",
          quantization: "Q3_K_S",
        },
        {
          name: "Phi-3-mini-Q5_K_M.gguf",
          size: "1.1 GB",
          quantization: "Q5_K_M",
        },
        {
          name: "TinyLlama-1.1B-Q8_0.gguf",
          size: "1.1 GB",
          quantization: "Q8_0",
        },
      ],
      tps: 0,
      contextUsed: 0,
    },
    network: {
      wifiSignal: -38,
      ports: [
        {
          port: 22,
          service: "SSH",
          open: false,
        },
        {
          port: 8080,
          service: "API Gateway",
          open: false,
        },
      ],
      sshAttempts: [],
      bandwidth: {
        up: 0,
        down: 0,
      },
    },
    port: 0,
    logs: [],
  },
  {
    id: "node-02",
    name: "Pi-Cluster-01",
    type: "raspberry-pi",
    status: "online",
    tailscaleIp: "100.64.0.2",
    location: "Server Rack",
    cpu: {
      cores: 4,
      model: "ARM Cortex-A72 (BCM2711)",
      usage: [],
      temp: 0,
    },
    ram: {
      total: 8,
      used: 0,
      wired: 0,
    },
    storage: { total: 128, system: 12, ai: 32, available: 84 },
    ai: {
      status: "idle",
      model: "TinyLlama-1.1B-Q8_0.gguf",
      contextMax: 2048,
      backend: "cpu",
      models: [],
      tps: 0,
      contextUsed: 0,
    },
    network: {
      wifiSignal: -55,
      ports: [
        {
          port: 22,
          service: "SSH",
          open: false,
        },
      ],
      sshAttempts: [],
      bandwidth: {
        up: 0,
        down: 0,
      },
    },
    port: 0,
    logs: [],
  },
  {
    id: "node-03",
    name: "Cloud-VPS",
    type: "cloud-vps",
    status: "degraded",
    tailscaleIp: "100.64.0.3",
    location: "US-East (Virginia)",
    cpu: {
      cores: 2,
      model: "AMD EPYC 7543P",
      usage: [],
      temp: 0,
    },
    ram: {
      total: 4,
      used: 0,
      wired: 0,
    },
    storage: { total: 80, system: 15, ai: 0, available: 65 },
    ai: {
      status: "idle",
      model: "—",
      contextMax: 0,
      backend: "cpu",
      models: [],
      tps: 0,
      contextUsed: 0,
    },
    network: {
      wifiSignal: -20,
      ports: [
        {
          port: 22,
          service: "SSH",
          open: false,
        },
      ],
      sshAttempts: [],
      bandwidth: {
        up: 0,
        down: 0,
      },
    },
    port: 0,
    logs: [],
  },
];

// Maps raw Go backend status response to a Partial<FleetNode>.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBackendStatus(data: any): Partial<FleetNode> {
  const statusMap: Record<string, FleetNode["status"]> = {
    Online: "online",
    Offline: "offline",
    Degraded: "degraded",
  };
  const aiStatusMap: Record<string, FleetNode["ai"]["status"]> = {
    Inferring: "inferring",
    Idle: "idle",
    Loading: "loading",
  };

  let overallTemp = -1;
  if (
    data.hardware?.temperatures?.overall !== "N/A" &&
    data.hardware?.temperatures?.overall !== undefined
  ) {
    const parsed = parseFloat(data.hardware.temperatures.overall as string);
    if (!isNaN(parsed)) overallTemp = parsed;
  }

  return {
    name: data.system?.node_name || "Unknown Model",
    status: statusMap[data.system?.status] || "online",
    tailscaleIp: data.system?.ip_address || "127.0.0.1",
    cpu: {
      cores: data.hardware?.cpu_usage?.length || 4,
      model: data.system?.cpu_model || "Unknown CPU",
      usage: (data.hardware?.cpu_usage || []).map(
        (c: { core: number; usage: number }) => c.usage,
      ),
      temp: overallTemp,
    },
    ram: {
      total: data.hardware?.memory?.total_gb || 0,
      used: data.hardware?.memory?.used_gb || 0,
      wired:
        (data.hardware?.memory?.used_gb || 0) -
        (data.hardware?.memory?.app_memory_gb || 0),
    },
    storage: {
      total: data.hardware?.storage?.total_gb || 0,
      system: data.hardware?.storage?.system_gb || 0,
      ai: data.hardware?.storage?.models_gb || 0,
      available: data.hardware?.storage?.available_gb || 0,
    },
    network: {
      wifiSignal: data.network?.signal_dbm || -50,
      ports: [],
      sshAttempts: [],
      bandwidth: { up: 0, down: 0 },
    },
    ai: {
      status: aiStatusMap[data.ai_engine?.status] || "idle",
      model: data.ai_engine?.active_model || "None",
      tps: data.ai_engine?.tokens_per_sec || 0,
      contextUsed: data.ai_engine?.context_used || 0,
      contextMax: data.ai_engine?.context_total || 8192,
      backend:
        data.ai_engine?.compute_backend?.toLowerCase() === "gpu"
          ? "gpu"
          : "cpu",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      models: (data.ai_engine?.available_models || []).map((m: any) => ({
        name: m.name,
        size: `${m.size_gb} GB`,
        quantization: m.quantization,
      })),
    },
  };
}

interface FleetState {
  nodes: FleetNode[];
  activeNodeId: string;
  agentFeed: FleetAgentLog[];
  loadBalancerEnabled: boolean;
  setActiveNodeId: (id: string) => void;
  setLoadBalancerEnabled: (v: boolean) => void;
  updateNodes: (nodes: FleetNode[]) => void;
  addLog: (log: FleetAgentLog) => void;
  applyBackendData: (data: Partial<FleetNode>) => void;
  setApiError: (hasError: boolean) => void;
  isInitialLoad: boolean;
  isApiError: boolean;
  refresh: () => Promise<void>;
}

export const useFleetStore = create<FleetState>((set) => ({
  nodes: FLEET_NODES_TEMPLATE.map((n) => generateMetrics(n, true)),
  activeNodeId: "node-01",
  agentFeed: [],
  loadBalancerEnabled: false,
  isInitialLoad: true,
  isApiError: false,
  setActiveNodeId: (id) => set({ activeNodeId: id }),
  setLoadBalancerEnabled: (v) => set({ loadBalancerEnabled: v }),
  updateNodes: (nodes) => set({ nodes }),
  addLog: (log) =>
    set((state) => ({ agentFeed: [...state.agentFeed.slice(-50), log] })),
  applyBackendData: (data) =>
    set((state) => ({
      isInitialLoad: false,
      isApiError: false,
      nodes: state.nodes.map((n) => {
        if (n.id === "node-01") {
          return { ...n, ...data };
        }
        return generateMetrics(n);
      }),
    })),
  setApiError: (hasError) =>
    set((state) => ({
      isApiError: hasError,
      nodes: hasError
        ? state.nodes.map((n) =>
            n.id === "node-01" ? { ...n, status: "offline" as const } : n,
          )
        : state.nodes,
    })),
  refresh: async () => {
    let data: Partial<FleetNode> | null = null;
    let hasError = false;
    try {
      const res = await fetch("/api/fleet/status", { cache: "no-store" });
      if (res.ok) {
        data = await res.json();
      } else {
        hasError = true;
      }
    } catch {
      // Backend unreachable, fallback to mock data
      hasError = true;
      console.log("Backend unreachable");
    }

    set((state) => ({
      isInitialLoad: false,
      isApiError: hasError,
      nodes: state.nodes.map((n) => {
        // Merge real data into node-01 (MBA-2020) if API returned data
        if (n.id === "node-01") {
          if (data) {
            return {
              ...n,
              ...data,
            };
          } else {
            // Error! Do not fall back to mock metrics for node-01 so error state is visible
            return {
              ...n,
              status: "offline",
            };
          }
        }
        // Other nodes keep simulated data
        return generateMetrics(n);
      }),
    }));
  },
}));

// Selectors for convenience
export const useActiveNode = () => {
  const nodes = useFleetStore((s) => s.nodes);
  const activeNodeId = useFleetStore((s) => s.activeNodeId);
  const nodeArray = Array.isArray(nodes) ? nodes : [];
  return nodeArray.find((n) => n.id === activeNodeId) || nodeArray[0] || generateMetrics(FLEET_NODES_TEMPLATE[0], true);
};

export const useAggregatedStats = () => {
  const nodes = useFleetStore((s) => s.nodes);
  const nodeArray = Array.isArray(nodes) ? nodes : [];
  return {
    totalRam: nodeArray.reduce((a, n) => a + (n.ram?.total || 0), 0),
    totalStorage: nodeArray.reduce((a, n) => a + (n.storage?.total || 0), 0),
    activeAiInstances: nodeArray.filter((n) => n.ai?.status === "inferring").length,
    onlineNodes: nodeArray.filter((n) => n.status !== "offline").length,
    totalNodes: nodeArray.length,
  };
};
