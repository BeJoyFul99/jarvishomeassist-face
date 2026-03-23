import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/energy?from=...&to=... → Go GET /api/v1/energy
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const params = new URLSearchParams();
  if (sp.get("from")) params.set("from", sp.get("from")!);
  if (sp.get("to")) params.set("to", sp.get("to")!);
  const qs = params.toString();
  return proxyToBackend(request, `/api/v1/energy${qs ? `?${qs}` : ""}`, "GET");
}
