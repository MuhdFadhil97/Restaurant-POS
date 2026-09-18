import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OutletState {
  activeOutletId: number | null;
  setActiveOutlet: (outletId: number) => void;
}

export const useOutletStore = create<OutletState>()(
  persist(
    (set) => ({
      activeOutletId: null,
      setActiveOutlet: (activeOutletId) => set({ activeOutletId }),
    }),
    { name: "pos-active-outlet" }
  )
);
