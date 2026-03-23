import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/energy/rates → Go GET /api/v1/energy/rates
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/energy/rates", "GET");
}
