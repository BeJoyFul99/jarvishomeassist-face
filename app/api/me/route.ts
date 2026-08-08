import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/me → Go GET /api/v1/me
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/me", "GET");
}

// PATCH /api/me → Go PATCH /api/v1/me
export async function PATCH(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/me", "PATCH");
}
