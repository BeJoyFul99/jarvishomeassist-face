import { NextRequest, NextResponse } from "next/server";
import { COOKIE_AT } from "@/lib/cookies";

const BACKEND_URL = process.env.GO_BACKEND_URL || "http://localhost:5000";

export const runtime = "nodejs";

async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const backendPath = `/api/v1/${path.join("/")}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const token = req.cookies.get(COOKIE_AT)?.value;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  const accept = req.headers.get("accept");
  if (accept) headers["accept"] = accept;

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    signal: AbortSignal.timeout(30_000),
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half";
  }

  try {
    const res = await fetch(`${BACKEND_URL}${backendPath}`, init);
    // Responses with status 204/205/304 must not carry a body per the Fetch spec,
    // so we skip reading/forwarding the body for those.
    const isBodyless = res.status === 204 || res.status === 205 || res.status === 304;
    const buf = isBodyless ? null : await res.arrayBuffer();
    const out = new NextResponse(buf, { status: res.status });
    if (!isBodyless) {
      const ct = res.headers.get("content-type");
      if (ct) out.headers.set("content-type", ct);
    }
    return out;
  } catch (error) {
    console.error(`Proxy error [${req.method} ${backendPath}]:`, error);
    return NextResponse.json(
      { error: "backend_unreachable", message: "Backend service is unreachable" },
      { status: 503 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
