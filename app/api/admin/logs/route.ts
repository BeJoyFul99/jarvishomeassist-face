import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

// GET /api/admin/logs → Go GET /api/v1/admin/logs
export async function GET(request: NextRequest) {
  return proxyToBackend(request, `/api/v1/admin/logs?${request.nextUrl.searchParams.toString()}`, "GET");
}
