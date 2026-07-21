// Shared system-status shapes used by the dashboard widgets.
// Live values come from the fleet store (/api/fleet/status via useFleet);
// the old mock useSystemStatus() hook has been removed.

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
  ssh_attempts: { ip: string; timestamp: string; success: boolean; service?: string }[];
  logs: string[];
}

export interface HistoryPoint {
  cpu: number;
  temp: number;
  ram: number;
  cores: number[];
}
