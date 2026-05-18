"use client";

import { useEffect, useRef, useState } from "react";

import {
  buildCartItemKey,
  getMissingRequiredOptionGroups
} from "@/entities/product/model/options";
import type { ProductWithSection } from "@/entities/product/model/types";
import type { AddToastState, CartItem } from "@/features/cart/model/types";
import type { SelectedProductOption } from "@/shared/model/restaurant";

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [addToast, setAddToast] = useState<AddToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (
    product: ProductWithSection,
    quantity = 1,
    selectedOptions: SelectedProductOption[] = []
  ) => {
    if (!product.isAvailable) return false;
    if (getMissingRequiredOptionGroups(product, selectedOptions).length) return false;

    const cartKey = buildCartItemKey(product.id, selectedOptions);

    setCart((current) => {
      const existing = current.find((item) => item.cartKey === cartKey);
      if (existing) {
        return current.map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...current, { ...product, cartKey, quantity, selectedOptions }];
    });

    return true;
  };

  const increaseCartItem = (cartKey: string, quantity = 1) => {
    setCart((current) =>
      current.map((item) =>
        item.cartKey === cartKey
          ? { ...item, quantity: Math.min(item.quantity + quantity, 99) }
          : item
      )
    );
  };

  const removeFromCart = (cartKey: string, quantity = 1) => {
    setCart((current) =>
      current
        .map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity - quantity } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const showAddToast = (
    product: ProductWithSection,
    quantity: number,
    selectedOptions: SelectedProductOption[]
  ) => {
    if (!product.isAvailable) return;

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setAddToast({
      product,
      quantity,
      selectedOptions,
      cartKey: buildCartItemKey(product.id, selectedOptions),
      id: Date.now()
    });
    toastTimerRef.current = window.setTimeout(() => {
      setAddToast(null);
    }, 5000);
  };

  const addProduct = (
    product: ProductWithSection,
    quantity = 1,
    selectedOptions: SelectedProductOption[] = []
  ) => {
    if (!product.isAvailable) return false;

    const added = addToCart(product, quantity, selectedOptions);

    if (added) {
      showAddToast(product, quantity, selectedOptions);
    }

    return added;
  };

  const undoLastAddition = () => {
    if (!addToast) return;

    removeFromCart(addToast.cartKey, addToast.quantity);
    setAddToast(null);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
  };

  return {
    addProduct,
    addToast,
    addToCart,
    cart,
    cartOpen,
    clearCart: () => setCart([]),
    closeCart: () => setCartOpen(false),
    increaseCartItem,
    openCart: () => setCartOpen(true),
    removeFromCart,
    subtotal,
    totalItems,
    undoLastAddition
  };
}
