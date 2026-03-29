import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/notifications/read-all", "POST");
}
