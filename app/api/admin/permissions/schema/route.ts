import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/admin/permissions/schema → Go GET /api/v1/admin/permissions/schema
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/admin/permissions/schema", "GET");
}
