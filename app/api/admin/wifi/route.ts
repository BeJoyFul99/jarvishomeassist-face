import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// POST /api/admin/wifi → Go POST /api/v1/admin/wifi
export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/admin/wifi", "POST");
}
