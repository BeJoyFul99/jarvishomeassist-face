import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

const BACKEND_URL = process.env.GO_BACKEND_URL || "http://localhost:5000";

// GET /api/chat/rooms/:id/messages?limit=50&before=123
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sp = request.nextUrl.searchParams;
  const qs = new URLSearchParams();
  if (sp.get("limit")) qs.set("limit", sp.get("limit")!);
  if (sp.get("before")) qs.set("before", sp.get("before")!);
  const query = qs.toString();
  return proxyToBackend(request, `/api/v1/chat/rooms/${id}/messages${query ? `?${query}` : ""}`, "GET");
}

// POST /api/chat/rooms/:id/messages
// Supports both JSON and multipart/form-data (for image uploads)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const contentType = request.headers.get("content-type") || "";

  // If multipart, forward the raw body as-is to the Go backend
  if (contentType.includes("multipart/form-data")) {
    const authHeader = request.headers.get("Authorization");
    const headers: Record<string, string> = {};
    if (authHeader) headers["Authorization"] = authHeader;
    // Forward content-type with boundary
    headers["Content-Type"] = contentType;

    try {
      const body = await request.arrayBuffer();
      const res = await fetch(`${BACKEND_URL}/api/v1/chat/rooms/${id}/messages`, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json(
        { error: "backend_unreachable" },
        { status: 503 },
      );
    }
  }

  // JSON body — use standard proxy
  return proxyToBackend(request, `/api/v1/chat/rooms/${id}/messages`, "POST");
}
