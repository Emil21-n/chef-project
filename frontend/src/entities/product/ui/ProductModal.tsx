"use client";

import { useEffect, useState } from "react";

import type { ProductWithSection } from "@/entities/product/model/types";
import { ProductImage } from "@/entities/product/ui/ProductImage";
import { formatPrice } from "@/shared/lib/format";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon
} from "@/shared/ui/icons";

type ProductModalProps = {
  product: ProductWithSection;
  isOpen: boolean;
  canSwitch: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onAdd: (product: ProductWithSection, quantity: number) => void;
};

export function ProductModal({
  product,
  isOpen,
  canSwitch,
  onPrevious,
  onNext,
  onClose,
  onAdd
}: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [product.id]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (canSwitch && event.key === "ArrowLeft") {
        onPrevious();
      }

      if (canSwitch && event.key === "ArrowRight") {
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canSwitch, isOpen, onClose, onNext, onPrevious]);

  const decrease = () => setQuantity((current) => Math.max(current - 1, 1));
  const increase = () => setQuantity((current) => Math.min(current + 1, 99));

  return (
    <div className={`productModalLayer ${isOpen ? "isOpen" : ""}`} aria-hidden={!isOpen}>
      <button className="productModalBackdrop" type="button" onClick={onClose} />
      <section
        className="productModalPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <button className="iconButton productModalClose" type="button" onClick={onClose}>
          <CloseIcon />
        </button>

        <div className="productModalMedia">
          <ProductImage product={product} />
        </div>

        <div className="productModalInfo">
          <div className="productMeta">
            <span>{product.sectionTitle}</span>
            {product.weight ? <span>{product.weight}</span> : null}
          </div>
          <h2 id="product-modal-title">{product.name}</h2>
          <p>{product.description || "Позиция из меню Chef's Choice."}</p>
          <strong className="modalPrice">{formatPrice(product.price)}</strong>

          <div className="modalControls">
            <div className="modalQuantity" aria-label={`Количество ${product.name}`}>
              <button type="button" onClick={decrease} aria-label="Уменьшить количество">
                <MinusIcon />
              </button>
              <span>{quantity}</span>
              <button type="button" onClick={increase} aria-label="Увеличить количество">
                <PlusIcon />
              </button>
            </div>
            <button
              className="modalAddButton"
              type="button"
              onClick={() => onAdd(product, quantity)}
            >
              Добавить в корзину
            </button>
          </div>

          <div className="modalSwitchers" aria-label="Переключение блюд">
            <button type="button" onClick={onPrevious} disabled={!canSwitch}>
              <ArrowLeftIcon />
              Предыдущее
            </button>
            <button type="button" onClick={onNext} disabled={!canSwitch}>
              Следующее
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
