import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, COOKIE_AT } from "@/lib/cookies";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.GO_BACKEND_URL || "http://localhost:5000";

  try {
    const accessToken = request.cookies.get(COOKIE_AT)?.value;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${backendUrl}/auth/logout`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    console.error("Logout proxy error:", error);
    // Even if backend unreachable, clear cookies so client is logged out
    const response = NextResponse.json(
      { message: "Logged out locally" },
      { status: 200 },
    );
    clearAuthCookies(response);
    return response;
  }
}
