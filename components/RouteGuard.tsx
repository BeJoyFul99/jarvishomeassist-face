"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

/** Routes only accessible to administrators (no resource perm override) */
const ADMIN_ONLY_ROUTES = [
  "/dashboard",
  "/analytics",
  "/inference",
  "/network",
  "/devices",
  "/terminal",
];

/** Routes that any non-admin can access if they have the right resource perm */
const PERM_GATED_ROUTES: Record<string, string> = {
  "/users": "user:view",
  "/home/devices": "smart_device:view",
  "/home/network": "network:view",
  "/home/media": "media:view",
};

/**
 * Client-side route guard.
 * - Unauthenticated → /login
 * - non-admin on admin-only route → /home
 * - non-admin on perm-gated route without the perm → /home
 */
export function useRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const effectiveRole = useAuthStore((s) => s.effectiveRole());
  const hasPermission = useAuthStore((s) => s.hasPermission);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated || !user) return;

    // Admins can go anywhere
    if (effectiveRole === "administrator") return;

    // Check perm-gated routes first
    const requiredPerm = PERM_GATED_ROUTES[pathname];
    if (requiredPerm) {
      if (!hasPermission(requiredPerm)) {
        router.replace("/home");
      }
      return;
    }

    // Non-admin users cannot access admin-only routes
    if (ADMIN_ONLY_ROUTES.some((r) => pathname === r)) {
      router.replace("/home");
    }
  }, [_hasHydrated, isAuthenticated, user, effectiveRole, hasPermission, pathname, router]);
}
