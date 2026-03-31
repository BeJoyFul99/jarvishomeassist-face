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

export function useFleet() {
  const {
    nodes,
    activeNodeId,
    agentFeed,
    loadBalancerEnabled,
    setActiveNodeId,
    setLoadBalancerEnabled,
    addLog,
    applyBackendData,
    setApiError,
    isInitialLoad,
    isApiError,
    refresh,
  } = useFleetStore();

  const activeNode = useActiveNode();
  const aggregated = useAggregatedStats();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Refs to avoid re-triggering the effect when callbacks change
  const addLogRef = useRef(addLog);
  addLogRef.current = addLog;
  const applyRef = useRef(applyBackendData);
  applyRef.current = applyBackendData;
  const setApiErrorRef = useRef(setApiError);
  setApiErrorRef.current = setApiError;

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

      addLogRef.current({
        nodeId: "node-01",
        nodeName: mapped.name || "node-01",
        message: "Status update received",
        timestamp: new Date().toISOString(),
        type: "pulse",
      });
    };

    const unsubscribe = sseClient.subscribe(handler);

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, refresh]);

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
