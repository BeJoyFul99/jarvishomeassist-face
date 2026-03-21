import { NextRequest } from "next/server";

const BACKEND_URL = process.env.GO_BACKEND_URL || "http://localhost:5000";

// GET /api/events → streams SSE from Go backend GET /api/v1/events
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing_token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/events`, {
      headers: {
        Authorization: authHeader,
        Accept: "text/event-stream",
      },
      signal: request.signal,
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "backend_error" }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream the SSE response through to the client
    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "backend_unreachable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
