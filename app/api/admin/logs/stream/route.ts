import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.GO_BACKEND_URL || "http://localhost:5000";

// GET /api/admin/logs/stream → SSE from Go backend GET /api/v1/admin/logs/stream
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing_token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort());

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/v1/admin/logs/stream`, {
      headers: {
        Authorization: authHeader,
        Accept: "text/event-stream",
      },
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(JSON.stringify({ error: "backend_error" }), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const upstreamReader = upstream.body.getReader();
    const stream = new ReadableStream({
      async pull(streamController) {
        try {
          const { done, value } = await upstreamReader.read();
          if (done) {
            streamController.close();
            return;
          }
          streamController.enqueue(value);
        } catch {
          streamController.close();
        }
      },
      cancel() {
        upstreamReader.cancel();
        controller.abort();
      },
    });

    return new Response(stream, {
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
