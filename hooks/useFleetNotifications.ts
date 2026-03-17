"use client";

import { useEffect, useRef } from "react";
import { useFleetStore, type FleetNode } from "@/store/useFleetStore";
import { useNotificationStore } from "@/store/useNotificationStore";

/**
 * Monitors fleet node changes and generates notifications for:
 * - High CPU temperature (> 90°C)
 * - Node status changes (online ↔ degraded ↔ offline)
 * - AI status changes (idle → inferring)
 * - Memory pressure (> 85% usage)
 */
export function useFleetNotifications() {
  const nodes = useFleetStore((s) => s.nodes);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const prevNodesRef = useRef<FleetNode[]>([]);
  const initialRef = useRef(true);

  useEffect(() => {
    // Skip the first render to avoid flooding on mount
    if (initialRef.current) {
      initialRef.current = false;
      prevNodesRef.current = nodes;
      return;
    }

    const prev = prevNodesRef.current;

    for (const node of nodes) {
      const prevNode = prev.find((n) => n.id === node.id);
      if (!prevNode) continue;

      // High temperature alert
      if (node.cpu.temp > 90 && prevNode.cpu.temp <= 90) {
        addNotification({
          title: "🔥 Thermal Warning",
          message: `${node.name} CPU temperature exceeded 90°C (${node.cpu.temp.toFixed(1)}°C). Consider enabling auto-sleep.`,
          type: "error",
          nodeId: node.id,
          nodeName: node.name,
        });
      }

      // Temperature recovered
      if (node.cpu.temp <= 90 && prevNode.cpu.temp > 90) {
        addNotification({
          title: "Temperature Normalized",
          message: `${node.name} CPU temperature returned to safe levels (${node.cpu.temp.toFixed(1)}°C).`,
          type: "success",
          nodeId: node.id,
          nodeName: node.name,
        });
      }

      // Node status change
      if (node.status !== prevNode.status) {
        if (node.status === "offline") {
          addNotification({
            title: "⚠️ Node Offline",
            message: `${node.name} (${node.tailscaleIp}) went offline.`,
            type: "error",
            nodeId: node.id,
            nodeName: node.name,
          });
        } else if (node.status === "degraded" && prevNode.status === "online") {
          addNotification({
            title: "Node Degraded",
            message: `${node.name} performance is degraded. Check system resources.`,
            type: "warning",
            nodeId: node.id,
            nodeName: node.name,
          });
        } else if (node.status === "online" && prevNode.status !== "online") {
          addNotification({
            title: "Node Back Online",
            message: `${node.name} is back online and fully operational.`,
            type: "success",
            nodeId: node.id,
            nodeName: node.name,
          });
        }
      }

      // AI status change
      if (node.ai.status !== prevNode.ai.status) {
        if (node.ai.status === "inferring" && prevNode.ai.status === "idle") {
          addNotification({
            title: "AI Inference Started",
            message: `${node.name} started inference with ${node.ai.model}.`,
            type: "info",
            nodeId: node.id,
            nodeName: node.name,
          });
        }
      }

      // Memory pressure
      const memUsage = node.ram.used / node.ram.total;
      const prevMemUsage = prevNode.ram.used / prevNode.ram.total;
      if (memUsage > 0.85 && prevMemUsage <= 0.85) {
        addNotification({
          title: "Memory Pressure",
          message: `${node.name} memory usage exceeds 85% (${(memUsage * 100).toFixed(0)}%).`,
          type: "warning",
          nodeId: node.id,
          nodeName: node.name,
        });
      }
    }

    prevNodesRef.current = nodes;
  }, [nodes, addNotification]);
}
