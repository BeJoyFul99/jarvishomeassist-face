import { NextRequest, NextResponse } from "next/server";
import { COOKIE_AT } from "@/lib/cookies";

const BACKEND_URL = process.env.GO_BACKEND_URL || "http://localhost:5000";

/**
 * Proxy a request to the Go backend, reading the JWT from the HttpOnly cookie.
 */
export async function proxyToBackend(
  request: NextRequest,
  backendPath: string,
  method: string = request.method,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Read JWT from HttpOnly cookie (invisible to client-side JS)
  const accessToken = request.cookies.get(COOKIE_AT)?.value;
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const fetchOpts: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(5000),
  };

  // Only include body for non-GET requests
  if (method !== "GET") {
    try {
      const body = await request.json();
      fetchOpts.body = JSON.stringify(body);
    } catch {
      // no body — that's fine for some requests
    }
  }

  try {
    const res = await fetch(`${BACKEND_URL}${backendPath}`, fetchOpts);

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "invalid_response", message: text };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Proxy error [${method} ${backendPath}]:`, error);
    return NextResponse.json(
      { error: "backend_unreachable", message: "Backend service is unreachable" },
      { status: 503 },
    );
  }
}
