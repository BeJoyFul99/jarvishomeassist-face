import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/cookies";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.GO_BACKEND_URL || "http://localhost:5000";

  try {
    const body = await request.json();

    const res = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Set tokens as HttpOnly cookies, return only user info to browser
    const response = NextResponse.json(
      { user: data.user },
      { status: res.status },
    );
    setAuthCookies(response, data.token, data.refresh_token);
    return response;
  } catch (error) {
    console.error("Auth proxy error:", error);
    return NextResponse.json(
      { error: "auth_unavailable", message: "Authentication service is unreachable" },
      { status: 503 },
    );
  }
}
