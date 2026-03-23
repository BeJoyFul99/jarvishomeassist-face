import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/energy/summary?period=day|week|month → Go
export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") || "day";
  return proxyToBackend(request, `/api/v1/energy/summary?period=${period}`, "GET");
}
