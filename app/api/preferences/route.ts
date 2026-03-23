import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/preferences → Go GET /api/v1/preferences
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/preferences", "GET");
}

// PUT /api/preferences → Go PUT /api/v1/preferences
export async function PUT(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/preferences", "PUT");
}
