import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/devices → Go GET /api/v1/devices
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/devices", "GET");
}
