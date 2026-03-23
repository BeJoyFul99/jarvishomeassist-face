import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/energy/today → Go GET /api/v1/energy/today
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/energy/today", "GET");
}
