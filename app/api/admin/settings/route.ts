import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// PUT /api/admin/settings → Go PUT /api/v1/admin/settings
export async function PUT(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/admin/settings", "PUT");
}
