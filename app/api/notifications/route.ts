import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/notifications → Go GET /api/v1/notifications
export async function GET(request: NextRequest) {
  const search = new URL(request.url).search;
  return proxyToBackend(request, `/api/v1/notifications${search}`, "GET");
}

// POST /api/notifications → Go POST /api/v1/notifications
export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/notifications", "POST");
}

// DELETE /api/notifications → Go DELETE /api/v1/notifications (clear all)
export async function DELETE(request: NextRequest) {
  return proxyToBackend(request, "/api/v1/notifications", "DELETE");
}
