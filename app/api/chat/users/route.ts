import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/chat/users → Go GET /api/v1/chat/users
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/chat/users", "GET");
}
