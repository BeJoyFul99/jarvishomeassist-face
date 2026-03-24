import { proxyToBackend } from "@/lib/apiProxy";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/v1/chat/authorize", "POST");
}
