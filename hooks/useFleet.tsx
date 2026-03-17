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
    isInitialLoad,
    isApiError,
    refresh,
  } = useFleetStore();

  const activeNode = useActiveNode();
  const aggregated = useAggregatedStats();

  useEffect(() => {
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
    return () => clearInterval(interval);
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

