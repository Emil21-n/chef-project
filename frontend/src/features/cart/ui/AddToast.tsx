"use client";

import type { AddToastState } from "@/features/cart/model/types";

type AddToastProps = {
  toast: AddToastState | null;
  onUndo: () => void;
};

export function AddToast({ toast, onUndo }: AddToastProps) {
  if (!toast) return null;

  return (
    <div className="addToast" role="status" aria-live="polite" key={toast.id}>
      <span>
        Добавлено: {toast.product.name} x {toast.quantity}
      </span>
      <button type="button" onClick={onUndo}>
        Отменить
      </button>
    </div>
  );
}
