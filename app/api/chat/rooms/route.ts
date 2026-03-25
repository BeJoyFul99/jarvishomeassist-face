import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";
// GET /api/chat/rooms → Go GET /api/v1/chat/rooms
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/chat/rooms", "GET");
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/chat/rooms", "POST");
}
