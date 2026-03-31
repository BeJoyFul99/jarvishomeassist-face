import { NextRequest } from "next/server";
import { COOKIE_AT } from "@/lib/cookies";

const BACKEND_URL = process.env.GO_BACKEND_URL || "http://localhost:5000";

// GET /api/fleet/status/stream → streams SSE from Go backend GET /api/v1/status/stream
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(COOKIE_AT)?.value;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "missing_token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Timeout the initial connection after 5s so we don't hang forever
    const controller = new AbortController();
    const connectTimeout = setTimeout(() => controller.abort(), 5000);
    request.signal.addEventListener("abort", () => controller.abort());

    const res = await fetch(`${BACKEND_URL}/api/v1/status/stream`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "text/event-stream",
      },
      signal: controller.signal,
    });
    clearTimeout(connectTimeout);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "backend_error" }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

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
