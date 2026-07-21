import { NextRequest, NextResponse } from "next/server";
import { COOKIE_AT } from "@/lib/cookies";

const BACKEND_URL = process.env.GO_BACKEND_URL || "http://localhost:5000";

interface JWTClaims {
  role?: string;
  resource_perms?: unknown;
  perm_expires_at?: string | null;
}

function decodeClaims(token: string): JWTClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as JWTClaims;
  } catch {
    return null;
  }
}

function requiredPermission(
  backendPath: string,
  method: string,
): string | null {
  const m = method.toUpperCase();

  if (backendPath.startsWith("/api/v1/devices")) {
    if (m === "GET") return "smart_device:view";
    if (backendPath.includes("/control") && m === "POST") {
      return "smart_device:control";
    }
  }

  if (backendPath.startsWith("/api/v1/admin/devices")) {
    return "smart_device:group";
  }

  if (backendPath.startsWith("/api/v1/wifi")) {
    return "network:view";
  }

  if (backendPath.startsWith("/api/v1/admin/wifi")) {
    return "network:manage";
  }

  return null;
}

function hasPermission(claims: JWTClaims, perm: string): boolean {
  const role = (claims.role || "").toLowerCase();
  if (role === "administrator" || role === "admin" || role === "root") {
    return true;
  }

  if (
    claims.perm_expires_at &&
    new Date(claims.perm_expires_at).getTime() < Date.now()
  ) {
    return false;
  }

  const perms = Array.isArray(claims.resource_perms)
    ? claims.resource_perms
    : [];
  return perms.includes(perm);
}

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

  const perm = requiredPermission(backendPath, method);
  if (perm) {
    if (!accessToken) {
      return NextResponse.json(
        { error: "missing_token", message: "Authentication required" },
        { status: 401 },
      );
    }

    const claims = decodeClaims(accessToken);
    if (!claims || !hasPermission(claims, perm)) {
      return NextResponse.json(
        {
          error: "insufficient_permissions",
          message: `Missing permission: ${perm}`,
        },
        { status: 403 },
      );
    }
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
