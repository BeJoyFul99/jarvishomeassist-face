import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/push/vapid-key", "GET");
}
