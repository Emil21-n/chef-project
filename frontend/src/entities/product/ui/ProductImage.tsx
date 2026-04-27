"use client";

import { useState } from "react";

import type { Product } from "@/shared/model/restaurant";

export function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);

  if (!product.image || failed) {
    return (
      <div className="productPlaceholder" aria-hidden="true">
        <span>{product.name.slice(0, 2)}</span>
      </div>
    );
  }

  return (
    <img
      src={product.image}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
