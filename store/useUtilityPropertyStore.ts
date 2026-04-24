import { create } from "zustand";
import { persist } from "zustand/middleware";

interface State {
  currentPropertyId: number | null;
  setCurrentPropertyId: (id: number | null) => void;
  _hasHydrated: boolean;
}

export const useUtilityPropertyStore = create<State>()(
  persist(
    (set) => ({
      currentPropertyId: null,
      setCurrentPropertyId: (id) => set({ currentPropertyId: id }),
      _hasHydrated: false,
    }),
    {
      name: "jha:utility-property",
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
      partialize: (s) => ({ currentPropertyId: s.currentPropertyId }),
    },
  ),
);
