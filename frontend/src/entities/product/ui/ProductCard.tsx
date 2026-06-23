"use client";

import { hasRequiredProductOptions } from "@/entities/product/model/options";
import type { ProductWithSection } from "@/entities/product/model/types";
import { ProductImage } from "@/entities/product/ui/ProductImage";
import { formatPrice } from "@/shared/lib/format";
import { MinusIcon, PlusIcon } from "@/shared/ui/icons";

type ProductCardCartState = {
  cartKey: string;
  quantity: number;
};

type ProductCardProps = {
  product: ProductWithSection;
  cartItem?: ProductCardCartState;
  onOpen: (product: ProductWithSection) => void;
  onAdd: (product: ProductWithSection) => void;
  onDecrease: (cartKey: string) => void;
  onIncrease: (cartKey: string) => void;
};

export function ProductCard({
  product,
  cartItem,
  onOpen,
  onAdd,
  onDecrease,
  onIncrease
}: ProductCardProps) {
  const isUnavailable = !product.isAvailable;
  const needsOptionSelection = hasRequiredProductOptions(product);
  const showQuantityControls = Boolean(cartItem) && !needsOptionSelection && !isUnavailable;

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
        {showQuantityControls && cartItem ? (
          <div
            className="productCardStepper"
            aria-label={`Количество ${product.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label={`Уменьшить количество ${product.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onDecrease(cartItem.cartKey);
              }}
            >
              <MinusIcon />
            </button>
            <span>{cartItem.quantity}</span>
            <button
              type="button"
              aria-label={`Увеличить количество ${product.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onIncrease(cartItem.cartKey);
              }}
            >
              <PlusIcon />
            </button>
          </div>
        ) : (
          <button
            className="productAddButton"
            type="button"
            disabled={isUnavailable}
            onClick={(event) => {
              event.stopPropagation();
              if (isUnavailable) return;
              if (needsOptionSelection) {
                onOpen(product);
                return;
              }
              onAdd(product);
            }}
          >
            {isUnavailable ? null : <PlusIcon />}
            {isUnavailable ? "Недоступно" : needsOptionSelection ? "Выбрать" : "Добавить"}
          </button>
        )}
      </div>
    </article>
  );
}
