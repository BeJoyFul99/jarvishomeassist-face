"use client";

import { useState, useEffect, useCallback } from "react";

export interface SystemStatus {
  cpu_temp: number;
  cpu_usage: number[];
  wifi_signal: number;
  ai_status: "idle" | "inferring" | "loading";
  ram_used_gb: number;
  ram_wired_gb: number;
  storage_system_gb: number;
  storage_ai_gb: number;
  storage_available_gb: number;
  tps: number;
  context_used: number;
  context_max: number;
  active_model: string;
  ports: { port: number; service: string; open: boolean }[];
  ssh_attempts: { ip: string; timestamp: string; success: boolean }[];
  logs: string[];
}

export interface HistoryPoint {
  cpu: number;
  temp: number;
  ram: number;
  cores: number[];
}

const generateMockData = (): SystemStatus => ({
  cpu_temp: 58 + Math.random() * 35,
  cpu_usage: Array.from({ length: 4 }, () => 15 + Math.random() * 70),
  wifi_signal: -(35 + Math.random() * 30),
  ai_status: Math.random() > 0.3 ? "inferring" : "idle",
  ram_used_gb: 8 + Math.random() * 6,
  ram_wired_gb: 2.5 + Math.random() * 2,
  storage_system_gb: 45,
  storage_ai_gb: 128,
  storage_available_gb: 327,
  tps: 8 + Math.random() * 12,
  context_used: Math.floor(2000 + Math.random() * 6000),
  context_max: 8192,
  active_model: "Mistral-7B-v0.3-Q4_K_M.gguf",
  ports: [
    { port: 22, service: "SSH", open: true },
    { port: 8080, service: "API Gateway", open: true },
    { port: 8081, service: "llama.cpp", open: Math.random() > 0.1 },
    { port: 3000, service: "Monitoring", open: Math.random() > 0.2 },
  ],
  ssh_attempts: [
    { ip: "192.168.1.42", timestamp: new Date(Date.now() - 120000).toISOString(), success: true },
    { ip: "10.0.0.15", timestamp: new Date(Date.now() - 300000).toISOString(), success: true },
    { ip: "45.33.32.156", timestamp: new Date(Date.now() - 600000).toISOString(), success: false },
    { ip: "192.168.1.100", timestamp: new Date(Date.now() - 900000).toISOString(), success: true },
  ],
  logs: [
    `[INFO] ${new Date().toISOString().slice(11, 19)} 200 GET /api/v1/status`,
    `[INFO] ${new Date().toISOString().slice(11, 19)} 200 POST /api/telemetry`,
    `[DEBUG] ${new Date().toISOString().slice(11, 19)} CPU temp: ${(58 + Math.random() * 35).toFixed(1)}°C`,
    `[INFO] ${new Date().toISOString().slice(11, 19)} 200 GET /api/v1/inference/status`,
    `[WARN] ${new Date().toISOString().slice(11, 19)} Memory pressure: moderate`,
  ],
});

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus>(generateMockData());
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const refresh = useCallback(() => {
    const newStatus = generateMockData();
    setStatus(newStatus);
    setHistory(prev => [
      ...prev.slice(-30),
      {
        cpu: newStatus.cpu_usage.reduce((a, b) => a + b, 0) / newStatus.cpu_usage.length,
        temp: newStatus.cpu_temp,
        ram: newStatus.ram_used_gb,
        cores: newStatus.cpu_usage,
      },
    ]);
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { status, history };
}
