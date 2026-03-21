import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "family_member" | "administrator" | "guest";

export interface AuthUser {
  displayName: string;
  email: string;
  role: UserRole;
  resourcePerms: string[];
  permExpiresAt: string | null;
}

interface JwtPayload {
  sub?: string;
  name?: string;
  email?: string;
  role?: string;
  resource_perms?: string[];
  perm_expires_at?: string | null;
  exp?: number;
  [key: string]: unknown;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Administrator previewing the family_member UI */
  viewingAsFamily: boolean;
  /** True once Zustand has rehydrated from localStorage */
  _hasHydrated: boolean;

  /** Effective role accounting for admin preview mode */
  effectiveRole: () => UserRole | null;

  /** Check if current user has a specific resource permission */
  hasPermission: (perm: string) => boolean;

  login: (token: string) => void;
  logout: () => void;
  setViewingAsFamily: (v: boolean) => void;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

function mapRole(raw: string | undefined): UserRole {
  if (!raw) return "family_member";
  const lower = raw.toLowerCase();
  if (
    lower === "administrator" ||
    lower === "admin" ||
    lower === "root"
  ) {
    return "administrator";
  }
  if (lower === "guest") {
    return "guest";
  }
  return "family_member";
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      viewingAsFamily: false,
      _hasHydrated: false,

      effectiveRole: () => {
        const { user, viewingAsFamily } = get();
        if (!user) return null;
        if (user.role === "administrator" && viewingAsFamily) {
          return "family_member";
        }
        return user.role;
      },

      hasPermission: (perm: string) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === "administrator") return true;
        if (
          user.permExpiresAt &&
          new Date(user.permExpiresAt) < new Date()
        ) {
          return false;
        }
        return user.resourcePerms.includes(perm);
      },

      login: (token: string) => {
        const payload = decodeJwt(token);
        if (!payload) return;

        const user: AuthUser = {
          displayName: payload.name || payload.sub || "User",
          email: payload.email || "",
          role: mapRole(payload.role),
          resourcePerms: payload.resource_perms || [],
          permExpiresAt: payload.perm_expires_at || null,
        };

        set({
          user,
          token,
          isAuthenticated: true,
          viewingAsFamily: false,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          viewingAsFamily: false,
        });
      },

      setViewingAsFamily: (v: boolean) => {
        set({ viewingAsFamily: v });
      },
    }),
    {
      name: "jarvis-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        viewingAsFamily: state.viewingAsFamily,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    },
  ),
);
