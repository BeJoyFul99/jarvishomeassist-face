import { NextResponse } from "next/server";
import { type FleetNode } from "@/store/useFleetStore";

export async function GET() {
  try {
    const backendUrl = process.env.GO_BACKEND_URL || "http://localhost:8080";
    const res = await fetch(`${backendUrl}/api/v1/status`, {
      cache: "no-store",
      // Set a short timeout for the internal fetch
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Go backend returned an error" },
        { status: 502 }, // Bad Gateway
      );
    }

    const data = await res.json();
    // Map the Go backend response directly to the Partial<FleetNode>
    // shape that the frontend Zustand store expects.
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

    // Calculate CPU temperature
    let overallTemp = -1;
    if (
      data.hardware?.temperatures?.overall !== "N/A" &&
      data.hardware?.temperatures?.overall !== undefined
    ) {
      const parsed = parseFloat(data.hardware.temperatures.overall as string);
      if (!isNaN(parsed)) overallTemp = parsed;
    }

    const mappedData: Partial<FleetNode> = {
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
        models: (data.ai_engine?.available_models || []).map((m: any) => ({
          name: m.name,
          size: `${m.size_gb} GB`,
          quantization: m.quantization,
        })),
      },
    };
    return NextResponse.json(mappedData);
  } catch (error) {
    console.error("Failed to fetch from Go backend:", error);
    return NextResponse.json(
      { error: "Fleet backend unreachable" },
      { status: 503 }, // Service Unavailable
    );
  }
}
