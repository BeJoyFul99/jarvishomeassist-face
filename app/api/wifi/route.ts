import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/wifi → Go GET /api/v1/wifi
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/wifi", "GET");
}
