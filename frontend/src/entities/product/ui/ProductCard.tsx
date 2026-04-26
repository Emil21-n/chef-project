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
  return (
    <article className="productCard" onClick={() => onOpen(product)}>
      <div className="productMedia">
        <ProductImage product={product} />
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
          onClick={(event) => {
            event.stopPropagation();
            onAdd(product);
          }}
        >
          <PlusIcon />
          Добавить
        </button>
      </div>
    </article>
  );
}
