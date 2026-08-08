import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "family_member" | "administrator" | "guest";

export interface AuthUser {
  display_name: string;
  email: string;
  role: UserRole;
  resourcePerms: string[];
  permExpiresAt: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Administrator previewing the family_member UI */
  viewingAsFamily: boolean;
  /** True once Zustand has rehydrated from localStorage */
  _hasHydrated: boolean;

  /** Effective role accounting for admin preview mode */
  effectiveRole: () => UserRole | null;

  /** Check if current user has a specific resource permission */
  hasPermission: (perm: string) => boolean;

  login: (user: AuthUser) => void;
  logout: () => void;
  /** Merge updated fields into the current user (e.g. after a profile save) */
  updateUser: (patch: Partial<AuthUser>) => void;
  setViewingAsFamily: (v: boolean) => void;
  /** Attempt to refresh the session using the HttpOnly refresh cookie */
  refresh: () => Promise<boolean>;
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

/** Map the backend user response to our AuthUser shape. */
function toAuthUser(backendUser: Record<string, unknown>): AuthUser {
  return {
    display_name: (backendUser.display_name as string) || "User",
    email: (backendUser.email as string) || "",
    role: mapRole(backendUser.role as string | undefined),
    resourcePerms: (backendUser.resource_perms as string[]) || [],
    permExpiresAt: (backendUser.perm_expires_at as string | null) || null,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
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
        // Only guests have time-bounded access; a stray permExpiresAt on a
        // family_member must not lock them out of their assigned perms.
        if (
          user.role === "guest" &&
          user.permExpiresAt &&
          new Date(user.permExpiresAt) < new Date()
        ) {
          return false;
        }
        return user.resourcePerms.includes(perm);
      },

      login: (user: AuthUser) => {
        set({
          user,
          isAuthenticated: true,
          viewingAsFamily: false,
        });
      },

      updateUser: (patch: Partial<AuthUser>) => {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, ...patch } });
      },

      logout: () => {
        // Fire-and-forget backend logout (clears HttpOnly cookies + DB tokens)
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        set({
          user: null,
          isAuthenticated: false,
          viewingAsFamily: false,
        });
      },

      refresh: async () => {
        try {
          // Cookies are sent automatically — no need to pass tokens
          const res = await fetch("/api/auth/refresh", { method: "POST" });

          if (!res.ok) {
            get().logout();
            return false;
          }

          const data = await res.json();
          set({ user: toAuthUser(data.user) });
          return true;
        } catch {
          return false;
        }
      },

      setViewingAsFamily: (v: boolean) => {
        set({ viewingAsFamily: v });
      },
    }),
    {
      name: "jarvis-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        viewingAsFamily: state.viewingAsFamily,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    },
  ),
);

export { toAuthUser, mapRole };
