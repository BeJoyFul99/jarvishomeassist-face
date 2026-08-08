import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_CURRENCY } from "@/lib/currency";

/**
 * Per-user preferences that the whole app reads (currency, and anything else
 * that affects rendering outside the Preferences page itself).
 *
 * Persisted so a reload paints with the right currency immediately instead of
 * flashing the default, then refreshed from the backend on mount.
 */
interface PreferencesState {
  currency: string;
  /** True once the backend values have been fetched at least once. */
  loaded: boolean;

  /** Merge server preference values in. Unknown keys are ignored. */
  applyServerPreferences: (prefs: Record<string, unknown>) => void;
  /** Optimistically set the currency (the Preferences page saves it). */
  setCurrency: (code: string) => void;
  /** Fetch preferences from the backend. Safe to call repeatedly. */
  loadPreferences: () => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY,
      loaded: false,

      applyServerPreferences: (prefs) => {
        const next: Partial<PreferencesState> = { loaded: true };
        if (typeof prefs.currency === "string" && prefs.currency) {
          next.currency = prefs.currency;
        }
        set(next);
      },

      setCurrency: (code) => set({ currency: code }),

      loadPreferences: async () => {
        try {
          // The user's own preference wins; the household default (a server
          // setting an admin picks) fills in for users who never chose one.
          const [prefsRes, settingsRes] = await Promise.all([
            fetch("/api/preferences"),
            fetch("/api/settings"),
          ]);

          const prefs = prefsRes.ok
            ? await prefsRes.json().catch(() => null)
            : null;
          const settings = settingsRes.ok
            ? await settingsRes.json().catch(() => null)
            : null;

          const pick = (src: unknown): string | null => {
            if (!src || typeof src !== "object") return null;
            const v = (src as Record<string, unknown>).currency;
            return typeof v === "string" && v ? v : null;
          };

          const resolved = pick(prefs) || pick(settings);
          set((s) => ({
            loaded: true,
            currency: resolved || s.currency,
          }));
        } catch {
          // Offline or backend down — keep the persisted value.
        }
      },
    }),
    {
      name: "jha:preferences",
      partialize: (s) => ({ currency: s.currency }),
    },
  ),
);

/** Convenience selector — the currency code alone, for formatting. */
export const useCurrency = () => usePreferencesStore((s) => s.currency);
