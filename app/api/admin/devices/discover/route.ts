import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// POST /api/admin/devices/discover → Go POST /api/v1/admin/devices/discover
export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/admin/devices/discover", "POST");
}
