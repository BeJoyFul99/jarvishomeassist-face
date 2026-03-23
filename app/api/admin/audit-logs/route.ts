import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/admin/audit-logs → Go GET /api/v1/admin/audit-logs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = searchParams.toString();
  const path = `/api/v1/admin/audit-logs${params ? `?${params}` : ""}`;
  return proxyToBackend(request, path, "GET");
}
