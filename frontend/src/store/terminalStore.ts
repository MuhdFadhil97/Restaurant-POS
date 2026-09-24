import { create } from "zustand";
import { persist } from "zustand/middleware";

// Which registered Terminal this browser/tablet *is*, per outlet (an admin's
// laptop can be "Counter 1" at one outlet and unassigned at another). Lives in
// localStorage on purpose: it's a property of the physical device, not of
// whoever is logged in, so it survives logout.
interface TerminalState {
  terminalByOutlet: Record<number, number>;
  // Outlets where someone chose "use browser printing" instead of assigning.
  dismissedOutlets: number[];
  assign: (outletId: number, terminalId: number) => void;
  unassign: (outletId: number) => void;
  dismiss: (outletId: number) => void;
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      terminalByOutlet: {},
      dismissedOutlets: [],
      assign: (outletId, terminalId) =>
        set((s) => ({
          terminalByOutlet: { ...s.terminalByOutlet, [outletId]: terminalId },
          dismissedOutlets: s.dismissedOutlets.filter((id) => id !== outletId),
        })),
      unassign: (outletId) =>
        set((s) => {
          const next = { ...s.terminalByOutlet };
          delete next[outletId];
          return { terminalByOutlet: next };
        }),
      dismiss: (outletId) =>
        set((s) => ({ dismissedOutlets: [...new Set([...s.dismissedOutlets, outletId])] })),
    }),
    { name: "pos-terminal" }
  )
);
