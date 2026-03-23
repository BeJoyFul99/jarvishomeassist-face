import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/energy/budget?month=3&year=2026 → Go
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const params = new URLSearchParams();
  if (sp.get("month")) params.set("month", sp.get("month")!);
  if (sp.get("year")) params.set("year", sp.get("year")!);
  const qs = params.toString();
  return proxyToBackend(request, `/api/v1/energy/budget${qs ? `?${qs}` : ""}`, "GET");
}
