"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore, type UserRole } from "@/store/useAuthStore";

/** Routes only accessible to administrators */
const ADMIN_ONLY_ROUTES = [
  "/dashboard",
  "/analytics",
  "/inference",
  "/network",
  "/devices",
  "/terminal",
  "/users",
];

/** Routes accessible to family_member (and admin previewing family) */
const FAMILY_ROUTES = ["/home", "/home/devices", "/home/network", "/home/media"];

/**
 * Client-side route guard.
 * - Unauthenticated → /login
 * - family_member on admin-only route → /home
 * - administrator on family route (without preview mode) is allowed (they can navigate freely)
 */
export function useRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const effectiveRole = useAuthStore((s) => s.effectiveRole());

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // The dashboard layout already handles redirect to /login,
      // but this is a safety net for any edge case.
      return;
    }

    // Non-admin users cannot access admin-only routes
    if (
      (effectiveRole === "family_member" || effectiveRole === "guest") &&
      ADMIN_ONLY_ROUTES.some((r) => pathname === r)
    ) {
      router.replace("/home");
    }
  }, [isAuthenticated, user, effectiveRole, pathname, router]);
}
