import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// POST /api/admin/energy → Go POST /api/v1/admin/energy
export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/admin/energy", "POST");
}
