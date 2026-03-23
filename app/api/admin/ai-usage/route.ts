import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

export const dynamic = "force-dynamic";

// GET /api/admin/ai-usage?endpoint=summary&days=7
// Proxies to various Go backend AI usage endpoints
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const endpoint = sp.get("endpoint") || "today";
  const days = sp.get("days") || "7";

  const validEndpoints = ["summary", "by-model", "errors", "today", "config"];
  if (!validEndpoints.includes(endpoint)) {
    return new Response(JSON.stringify({ error: "invalid_endpoint" }), { status: 400 });
  }

  const qs = endpoint === "config" ? "" : `?days=${days}`;
  return proxyToBackend(request, `/api/v1/admin/ai-usage/${endpoint}${qs}`, "GET");
}
