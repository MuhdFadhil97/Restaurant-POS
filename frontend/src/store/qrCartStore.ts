import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface QrCartItem {
  key: string;
  productId: number;
  variantId?: number;
  name: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
}

interface QrCartState {
  // Keyed by table QR token so a customer's cart survives a reload without
  // ever leaking between different tables/outlets on the same device.
  cartsByToken: Record<string, QrCartItem[]>;
  addItem: (token: string, item: Omit<QrCartItem, "quantity" | "notes">) => void;
  setQuantity: (token: string, key: string, quantity: number) => void;
  setNotes: (token: string, key: string, notes: string) => void;
  clearCart: (token: string) => void;
}

export const useQrCartStore = create<QrCartState>()(
  persist(
    (set) => ({
      cartsByToken: {},
      addItem: (token, item) =>
        set((state) => {
          const cart = state.cartsByToken[token] ?? [];
          // Only merge into a line with no note: once a line carries a note it's
          // its own dish ("no sugar"), so another tap starts a fresh plain line.
          const idx = cart.findIndex(
            (i) => i.productId === item.productId && i.variantId === item.variantId && !i.notes
          );
          const nextCart =
            idx >= 0
              ? cart.map((i, index) => (index === idx ? { ...i, quantity: i.quantity + 1 } : i))
              : [...cart, { ...item, key: `${item.key}#${Math.random().toString(36).slice(2, 8)}`, quantity: 1 }];
          return { cartsByToken: { ...state.cartsByToken, [token]: nextCart } };
        }),
      setNotes: (token, key, notes) =>
        set((state) => {
          const cart = state.cartsByToken[token] ?? [];
          return {
            cartsByToken: {
              ...state.cartsByToken,
              [token]: cart.map((i) => (i.key === key ? { ...i, notes } : i)),
            },
          };
        }),
      setQuantity: (token, key, quantity) =>
        set((state) => {
          const cart = state.cartsByToken[token] ?? [];
          const nextCart =
            quantity <= 0 ? cart.filter((i) => i.key !== key) : cart.map((i) => (i.key === key ? { ...i, quantity } : i));
          return { cartsByToken: { ...state.cartsByToken, [token]: nextCart } };
        }),
      clearCart: (token) =>
        set((state) => ({ cartsByToken: { ...state.cartsByToken, [token]: [] } })),
    }),
    { name: "pos-qr-cart" }
  )
);
