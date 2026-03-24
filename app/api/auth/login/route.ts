import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_GO_BACKEND_URL || "http://localhost:5000";

  try {
    const body = await request.json();

    const res = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Auth proxy error:", error);
    return NextResponse.json(
      { error: "auth_unavailable", message: "Authentication service is unreachable" },
      { status: 503 },
    );
  }
}
