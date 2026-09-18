import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// "Keep me signed in" toggle on the login page: when off, the session lives only
// in sessionStorage (cleared when the till's browser/tab closes) instead of localStorage.
let persistSessionAcrossRestarts = true;
export function setRememberSession(remember: boolean) {
  persistSessionAcrossRestarts = remember;
}

const dualStorage = {
  getItem: (name: string) => localStorage.getItem(name) ?? sessionStorage.getItem(name),
  setItem: (name: string, value: string) => {
    if (persistSessionAcrossRestarts) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

export type Role = "ADMIN" | "MANAGER" | "CASHIER" | "KITCHEN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  outletIds: string[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: "pos-auth", storage: createJSONStorage(() => dualStorage) }
  )
);
