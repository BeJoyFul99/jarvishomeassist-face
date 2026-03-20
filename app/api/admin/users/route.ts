import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/admin/users → Go GET /api/v1/admin/users
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/admin/users", "GET");
}

// POST /api/admin/users → Go POST /api/v1/admin/users
export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/admin/users", "POST");
}
