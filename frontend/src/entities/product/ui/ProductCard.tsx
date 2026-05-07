"use client";

import type { ProductWithSection } from "@/entities/product/model/types";
import { ProductImage } from "@/entities/product/ui/ProductImage";
import { formatPrice } from "@/shared/lib/format";
import { PlusIcon } from "@/shared/ui/icons";

type ProductCardProps = {
  product: ProductWithSection;
  onOpen: (product: ProductWithSection) => void;
  onAdd: (product: ProductWithSection) => void;
};

export function ProductCard({ product, onOpen, onAdd }: ProductCardProps) {
  const isUnavailable = !product.isAvailable;

  return (
    <article
      className={`productCard ${isUnavailable ? "isUnavailable" : ""}`}
      onClick={() => onOpen(product)}
    >
      <div className="productMedia">
        <ProductImage product={product} />
        {isUnavailable ? (
          <span className="productAvailabilityBadge">Нет в наличии</span>
        ) : null}
      </div>
      <div className="productBody">
        <div className="productMeta">
          <span>{product.sectionTitle}</span>
          {product.weight ? <span>{product.weight}</span> : null}
        </div>
        <h3>{product.name}</h3>
        <p>{product.description || "Позиция из меню Chef's Choice."}</p>
      </div>
      <div className="productFooter">
        <strong>{formatPrice(product.price)}</strong>
        <button
          type="button"
          disabled={isUnavailable}
          onClick={(event) => {
            event.stopPropagation();
            if (isUnavailable) return;
            onAdd(product);
          }}
        >
          {isUnavailable ? null : <PlusIcon />}
          {isUnavailable ? "Недоступно" : "Добавить"}
        </button>
      </div>
    </article>
  );
}
