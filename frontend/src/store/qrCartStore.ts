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
}

interface QrCartState {
  // Keyed by table QR token so a customer's cart survives a reload without
  // ever leaking between different tables/outlets on the same device.
  cartsByToken: Record<string, QrCartItem[]>;
  addItem: (token: string, item: Omit<QrCartItem, "quantity">) => void;
  setQuantity: (token: string, key: string, quantity: number) => void;
  clearCart: (token: string) => void;
}

export const useQrCartStore = create<QrCartState>()(
  persist(
    (set) => ({
      cartsByToken: {},
      addItem: (token, item) =>
        set((state) => {
          const cart = state.cartsByToken[token] ?? [];
          const idx = cart.findIndex((i) => i.key === item.key);
          const nextCart =
            idx >= 0
              ? cart.map((i, index) => (index === idx ? { ...i, quantity: i.quantity + 1 } : i))
              : [...cart, { ...item, quantity: 1 }];
          return { cartsByToken: { ...state.cartsByToken, [token]: nextCart } };
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
