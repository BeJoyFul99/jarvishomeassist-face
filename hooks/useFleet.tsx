import { useEffect, useRef } from "react";
import {
  useFleetStore,
  useActiveNode,
  useAggregatedStats,
  mapBackendStatus,
  type FleetAgentLog,
} from "@/store/useFleetStore";
import { useAuthStore } from "@/store/useAuthStore";
import { sseClient, type SSEMessage } from "@/lib/sseClient";

/**
 * useFleetStream owns the single SSE subscription that feeds the fleet store
 * and appends one Agent-Feed heartbeat per tick. Mount it EXACTLY ONCE (in the
 * dashboard layout). Calling it from every consumer would multiply the feed
 * entries (one per mount) — that's why useFleet() below is subscription-free.
 */
export function useFleetStream() {
  const addLog = useFleetStore((s) => s.addLog);
  const applyBackendData = useFleetStore((s) => s.applyBackendData);
  const refresh = useFleetStore((s) => s.refresh);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const addLogRef = useRef(addLog);
  addLogRef.current = addLog;
  const applyRef = useRef(applyBackendData);
  applyRef.current = applyBackendData;

  useEffect(() => {
    if (!isAuthenticated) {
      // No auth — fall back to polling the public snapshot endpoint
      const interval = setInterval(() => refresh(), 5000);
      refresh();
      return () => clearInterval(interval);
    }

    // Signal auth state to SSE client (cookies carry the JWT)
    sseClient.setAuthenticated(true);

    const handler = (msg: SSEMessage) => {
      if (msg.type !== "status:update") return;

      const mapped = mapBackendStatus(msg.data);
      applyRef.current(mapped);

      // Real one-line heartbeat summary for the Agent Feed.
      const cores = mapped.cpu?.usage ?? [];
      const cpuAvg = cores.length
        ? Math.round(cores.reduce((a, b) => a + b, 0) / cores.length)
        : 0;
      const ramUsed = mapped.ram?.used ?? 0;
      const ramTotal = mapped.ram?.total ?? 0;
      const conns = mapped.network?.sshAttempts?.length ?? 0;
      addLogRef.current({
        nodeId: "node-01",
        nodeName: mapped.name || "node-01",
        message: `CPU ${cpuAvg}% · RAM ${ramUsed.toFixed(1)}/${ramTotal.toFixed(0)}GB · ${conns} conn`,
        timestamp: new Date().toISOString(),
        type: cpuAvg > 90 ? "warning" : "pulse",
      });
    };

    const unsubscribe = sseClient.subscribe(handler);
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, refresh]);
}

/** Subscription-free reader for fleet state. Safe to call from any component. */
export function useFleet() {
  const {
    nodes,
    activeNodeId,
    agentFeed,
    loadBalancerEnabled,
    setActiveNodeId,
    setLoadBalancerEnabled,
    isInitialLoad,
    isApiError,
  } = useFleetStore();

  const activeNode = useActiveNode();
  const aggregated = useAggregatedStats();

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
