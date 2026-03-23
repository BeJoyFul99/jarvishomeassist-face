import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/settings → Go GET /api/v1/settings
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/settings", "GET");
}
