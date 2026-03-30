import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// POST /api/admin/announcements → Go POST /api/v1/admin/announcements
export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/admin/announcements", "POST");
}
