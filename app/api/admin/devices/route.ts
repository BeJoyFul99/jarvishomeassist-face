import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// POST /api/admin/devices → Go POST /api/v1/admin/devices
export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/admin/devices", "POST");
}
