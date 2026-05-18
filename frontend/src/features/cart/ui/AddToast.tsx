"use client";

import type { AddToastState } from "@/features/cart/model/types";
import { formatSelectedOptions } from "@/entities/product/model/options";

type AddToastProps = {
  toast: AddToastState | null;
  onUndo: () => void;
};

export function AddToast({ toast, onUndo }: AddToastProps) {
  if (!toast) return null;

  const selectedOptions = formatSelectedOptions(toast.selectedOptions);

  return (
    <div className="addToast" role="status" aria-live="polite" key={toast.id}>
      <span>
        Добавлено: {toast.product.name} x {toast.quantity}
        {selectedOptions ? <small>{selectedOptions}</small> : null}
      </span>
      <button type="button" onClick={onUndo}>
        Отменить
      </button>
    </div>
  );
}
