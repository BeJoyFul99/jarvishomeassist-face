import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/announcements → Go GET /api/v1/announcements
export async function GET(request: NextRequest) {
  const search = new URL(request.url).search;
  return proxyToBackend(request, `/api/v1/announcements${search}`, "GET");
}
