import { NextResponse } from "next/server";

const IS_PROD = process.env.NODE_ENV === "production";

const COOKIE_AT = "jarvis_at"; // access token
const COOKIE_RT = "jarvis_rt"; // refresh token

/** Max-age values matching Go backend defaults */
const AT_MAX_AGE = 15 * 60; // 15 minutes (matches JWT_EXPIRY_MINUTES default)
const RT_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (matches REFRESH_EXPIRY_DAYS default)

/**
 * Set HttpOnly auth cookies on a NextResponse.
 * Access token scoped to /api, refresh token scoped to /api/auth.
 */
export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  res.cookies.set(COOKIE_AT, accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/api",
    maxAge: AT_MAX_AGE,
  });

  res.cookies.set(COOKIE_RT, refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: RT_MAX_AGE,
  });

  return res;
}

/** Clear both auth cookies. */
export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(COOKIE_AT, "", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/api",
    maxAge: 0,
  });

  res.cookies.set(COOKIE_RT, "", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });

  return res;
}

export { COOKIE_AT, COOKIE_RT };
