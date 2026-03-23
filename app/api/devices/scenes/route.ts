import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/devices/scenes → Go GET /api/v1/devices/scenes
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/devices/scenes", "GET");
}
