import { useEffect } from "react";
import {
  useFleetStore,
  useActiveNode,
  useAggregatedStats,
  type FleetNode,
  type FleetAgentLog,
} from "@/store/useFleetStore";

export function useFleet() {
  const {
    nodes,
    activeNodeId,
    agentFeed,
    loadBalancerEnabled,
    setActiveNodeId,
    setLoadBalancerEnabled,
    addLog,
    updateNodes,
    isInitialLoad,
    isApiError,
    refresh,
  } = useFleetStore();

  const activeNode = useActiveNode();
  const aggregated = useAggregatedStats();

  useEffect(() => {
    let cancelled = false;

    // If we have an authenticated user, prefer the SSE status stream (no polling).
    // Otherwise fall back to the existing periodic refresh (public snapshot).
    const startStream = async () => {
      try {
        const auth = (await import('@/store/useAuthStore')).useAuthStore;
        const token = auth.getState().token;

        if (!token) {
          // No token — fallback to polling snapshot endpoint
          const interval = setInterval(async () => {
            await refresh();

            const nodeNames = ["MBA-2020", "Pi-Cluster-01", "Cloud-VPS"];
            const nodeIds = ["node-01", "node-02", "node-03"];
            const idx = Math.floor(Math.random() * 3);

            addLog({
              nodeId: nodeIds[idx],
              nodeName: nodeNames[idx],
              message: "Metrics Synced",
              timestamp: new Date().toISOString(),
              type: "info",
            });
          }, 5000);
          // store the interval id on the function so cleanup can clear it
          (startStream as any)._interval = interval;
          return;
        }

        const res = await fetch('/api/fleet/status/stream', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
        });

        if (!res.ok || !res.body) {
          // fallback to polling if stream cannot be opened
          if (!cancelled) setTimeout(startStream, 3000);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const data = JSON.parse(jsonStr);

              // Map backend status payload to Partial<FleetNode>
              let overallTemp = -1;
              if (
                data.hardware?.temperatures?.overall !== 'N/A' &&
                data.hardware?.temperatures?.overall !== undefined
              ) {
                const parsed = parseFloat(data.hardware.temperatures.overall as string);
                if (!isNaN(parsed)) overallTemp = parsed;
              }

              const mappedData = {
                name: data.system?.node_name || 'Unknown Model',
                status:
                  (data.system?.status === 'Online' && 'online') ||
                  (data.system?.status === 'Degraded' && 'degraded') ||
                  'offline',
                tailscaleIp: data.system?.ip_address || '127.0.0.1',
                cpu: {
                  cores: data.hardware?.cpu_usage?.length || 4,
                  model: data.system?.cpu_model || 'Unknown CPU',
                  usage: (data.hardware?.cpu_usage || []).map(
                    (c: any) => c.usage,
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
                  status:
                    (data.ai_engine?.status === 'Inferring' && 'inferring') ||
                    (data.ai_engine?.status === 'Loading' && 'loading') ||
                    'idle',
                  model: data.ai_engine?.active_model || 'None',
                  tps: data.ai_engine?.tokens_per_sec || 0,
                  contextUsed: data.ai_engine?.context_used || 0,
                  contextMax: data.ai_engine?.context_total || 8192,
                  backend:
                    data.ai_engine?.compute_backend?.toLowerCase() === 'gpu'
                      ? 'gpu'
                      : 'cpu',
                  models: (data.ai_engine?.available_models || []).map((m: any) => ({
                    name: m.name,
                    size: `${m.size_gb} GB`,
                    quantization: m.quantization,
                  })),
                },
              } as any;

              // Merge into existing nodes array (update node-01)
              const cur = useFleetStore.getState().nodes;
              const next = cur.map((n) => (n.id === "node-01" ? { ...n, ...mappedData } : n));
              updateNodes(next);

              // Add a simple agent log entry
              addLog({
                nodeId: 'node-01',
                nodeName: mappedData.name || 'node-01',
                message: 'Status update received',
                timestamp: new Date().toISOString(),
                type: 'pulse',
              });
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err) {
        // Retry after delay unless cancelled
        if (!cancelled) setTimeout(startStream, 3000);
      }
    };

    startStream();

    return () => {
      cancelled = true;
      const interval = (startStream as any)._interval;
      if (interval) clearInterval(interval);
    };
  }, [refresh, addLog]);

  return {
    nodes,
    activeNodeId,
    activeNode,
    setActiveNodeId,
    agentFeed,
    aggregated,
    loadBalancerEnabled,
    setLoadBalancerEnabled,
    isInitialLoad,
    isApiError,
  };
}
export { FleetAgentLog };

