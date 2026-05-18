"use client";

import { useEffect, useState } from "react";

import {
  buildSelectedProductOptions,
  getMissingRequiredOptionGroups,
  getProductOptionGroups
} from "@/entities/product/model/options";
import type { ProductWithSection } from "@/entities/product/model/types";
import { ProductImage } from "@/entities/product/ui/ProductImage";
import { formatPrice } from "@/shared/lib/format";
import type { SelectedProductOption } from "@/shared/model/restaurant";
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
  onAdd: (
    product: ProductWithSection,
    quantity: number,
    selectedOptions: SelectedProductOption[]
  ) => boolean;
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
  const [selectedOptionIds, setSelectedOptionIds] = useState<Record<string, string>>({});
  const [optionError, setOptionError] = useState("");
  const optionGroups = getProductOptionGroups(product);
  const isUnavailable = !product.isAvailable;

  useEffect(() => {
    setQuantity(1);
    setSelectedOptionIds({});
    setOptionError("");
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
  const selectedOptions = buildSelectedProductOptions(product, selectedOptionIds);

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

          {optionGroups.length ? (
            <div className="productOptions">
              {optionGroups.map((group) => (
                <div className="productOptionGroup" key={group.id}>
                  <div className="productOptionHeader">
                    <span>{group.label}</span>
                    {group.required ? <small>Обязательно</small> : null}
                  </div>
                  <div className="productOptionChoices" aria-label={group.label}>
                    {group.options.map((option) => {
                      const isSelected = selectedOptionIds[group.id] === option.id;

                      return (
                        <button
                          className={isSelected ? "isSelected" : ""}
                          type="button"
                          aria-pressed={isSelected}
                          key={option.id}
                          disabled={isUnavailable}
                          onClick={() => {
                            setSelectedOptionIds((current) => ({
                              ...current,
                              [group.id]: option.id
                            }));
                            setOptionError("");
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {optionError ? (
                <p className="optionError" role="alert">
                  {optionError}
                </p>
              ) : null}
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
                const missingRequiredOptions = getMissingRequiredOptionGroups(
                  product,
                  selectedOptions
                );

                if (missingRequiredOptions.length) {
                  setOptionError(
                    `Выберите ${missingRequiredOptions[0].label.toLowerCase()} перед добавлением.`
                  );
                  return;
                }

                const added = onAdd(product, quantity, selectedOptions);
                if (!added) {
                  setOptionError("Не удалось добавить позицию. Проверьте выбранные параметры.");
                }
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
