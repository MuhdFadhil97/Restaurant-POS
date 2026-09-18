import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "ADMIN" | "MANAGER" | "CASHIER" | "KITCHEN";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  username: string;
  role: Role;
  outletIds: number[];
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
    { name: "pos-auth" }
  )
);
