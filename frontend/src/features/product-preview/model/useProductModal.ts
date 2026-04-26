"use client";

import { useEffect, useRef, useState } from "react";

import type { ProductWithSection } from "@/entities/product/model/types";

export function useProductModal(products: ProductWithSection[]) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const modalCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (modalCloseTimerRef.current) {
        window.clearTimeout(modalCloseTimerRef.current);
      }
    };
  }, []);

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedProductIndex = selectedProduct
    ? products.findIndex((product) => product.id === selectedProduct.id)
    : -1;

  const openProductModal = (product: ProductWithSection) => {
    if (modalCloseTimerRef.current) {
      window.clearTimeout(modalCloseTimerRef.current);
    }

    setSelectedProductId(product.id);
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    setProductModalOpen(false);

    if (modalCloseTimerRef.current) {
      window.clearTimeout(modalCloseTimerRef.current);
    }

    modalCloseTimerRef.current = window.setTimeout(() => {
      setSelectedProductId(null);
    }, 260);
  };

  const switchSelectedProduct = (direction: -1 | 1) => {
    if (!products.length || selectedProductIndex < 0) return;

    const nextIndex = (selectedProductIndex + direction + products.length) % products.length;
    setSelectedProductId(products[nextIndex].id);
    setProductModalOpen(true);
  };

  return {
    closeProductModal,
    openProductModal,
    productModalOpen,
    selectedProduct,
    switchSelectedProduct
  };
}
