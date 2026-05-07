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
  const isUnavailable = !product.isAvailable;

  useEffect(() => {
    setQuantity(1);
  }, [product.id]);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
        className={`productModalPanel ${isUnavailable ? "isUnavailable" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <button className="iconButton productModalClose" type="button" onClick={onClose}>
          <CloseIcon />
        </button>

        <div className="productModalMedia">
          <ProductImage product={product} />
          {isUnavailable ? (
            <span className="productAvailabilityBadge productModalAvailability">
              Нет в наличии
            </span>
          ) : null}
        </div>

        <div className="productModalInfo">
          <div className="productMeta">
            <span>{product.sectionTitle}</span>
            {product.weight ? <span>{product.weight}</span> : null}
          </div>
          <h2 id="product-modal-title">{product.name}</h2>
          <p>{product.description || "Позиция из меню Chef's Choice."}</p>
          <strong className="modalPrice">{formatPrice(product.price)}</strong>
          {isUnavailable ? (
            <div className="availabilityNotice" role="status">
              Эта позиция сейчас недоступна для заказа. Она останется в меню, чтобы
              гости видели ассортимент.
            </div>
          ) : null}

          <div className="modalControls">
            <div className="modalQuantity" aria-label={`Количество ${product.name}`}>
              <button
                type="button"
                onClick={decrease}
                disabled={isUnavailable}
                aria-label="Уменьшить количество"
              >
                <MinusIcon />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={increase}
                disabled={isUnavailable}
                aria-label="Увеличить количество"
              >
                <PlusIcon />
              </button>
            </div>
            <button
              className="modalAddButton"
              type="button"
              disabled={isUnavailable}
              onClick={() => {
                if (isUnavailable) return;
                onAdd(product, quantity);
              }}
            >
              {isUnavailable ? "Нет в наличии" : "Добавить в корзину"}
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
