import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies, clearAuthCookies, COOKIE_AT, COOKIE_RT } from "@/lib/cookies";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.GO_BACKEND_URL || "http://localhost:5000";

  try {
    // Read tokens from HttpOnly cookies (browser can't touch these)
    const accessToken = request.cookies.get(COOKIE_AT)?.value ?? "";
    const refreshToken = request.cookies.get(COOKIE_RT)?.value ?? "";

    if (!refreshToken) {
      return NextResponse.json(
        { error: "no_refresh_token", message: "No refresh token" },
        { status: 401 },
      );
    }

    // Forward to Go backend in the format it expects
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${backendUrl}/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();

    if (!res.ok) {
      // Refresh failed — clear stale cookies
      const response = NextResponse.json(data, { status: res.status });
      clearAuthCookies(response);
      return response;
    }

    // Set new rotated tokens as HttpOnly cookies
    const response = NextResponse.json(
      { user: data.user },
      { status: res.status },
    );
    setAuthCookies(response, data.token, data.refresh_token);
    return response;
  } catch (error) {
    console.error("Refresh proxy error:", error);
    return NextResponse.json(
      { error: "auth_unavailable", message: "Authentication service is unreachable" },
      { status: 503 },
    );
  }
}
