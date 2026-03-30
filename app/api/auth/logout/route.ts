import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.GO_BACKEND_URL || "http://localhost:5000";

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const authHeader = request.headers.get("Authorization");
    if (authHeader) headers["Authorization"] = authHeader;

    const res = await fetch(`${backendUrl}/auth/logout`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Logout proxy error:", error);
    // Even if the backend is unreachable, the client should still clear local state
    return NextResponse.json(
      { message: "Logged out locally" },
      { status: 200 },
    );
  }
}
