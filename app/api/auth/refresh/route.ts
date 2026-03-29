import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.GO_BACKEND_URL || "http://localhost:5000";

  try {
    const body = await request.json();

    // Forward the expired JWT so the backend can identify the user
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) headers["Authorization"] = authHeader;

    const res = await fetch(`${backendUrl}/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Refresh proxy error:", error);
    return NextResponse.json(
      { error: "auth_unavailable", message: "Authentication service is unreachable" },
      { status: 503 },
    );
  }
}
