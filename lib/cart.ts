"use client";

import type { Design, PrintArea, ShirtBox } from "./design";

export type CartItem = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  colorName: string;
  colorHex: string;
  sizes: Record<string, number>;
  design: Design;
  printMethod: string;
  shirtBox: ShirtBox;
  printFront: PrintArea;
  printBack: PrintArea;
  quantity: number;
  // Display only. The server recomputes the real price from the price tiers.
  unitPricePaise: number;
  lineTotalPaise: number;
};

const KEY = "sg_cart_v1";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function setCart(items: CartItem[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("sg-cart"));
}

export function addToCart(item: CartItem): void {
  const cart = getCart();
  cart.push(item);
  setCart(cart);
}

export function removeFromCart(id: string): void {
  setCart(getCart().filter((i) => i.id !== id));
}

export function clearCart(): void {
  setCart([]);
}
