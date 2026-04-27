"use client";

import { useEffect, useState } from "react";

import type { ProductWithSection } from "@/entities/product/model/types";
import type { CartItem } from "@/features/cart/model/types";
import { formatPrice } from "@/shared/lib/format";
import { CloseIcon, MinusIcon, PlusIcon } from "@/shared/ui/icons";

type CartDrawerProps = {
  cart: CartItem[];
  isOpen: boolean;
  subtotal: number;
  onClose: () => void;
  onAdd: (item: ProductWithSection) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  minOrder: number;
};

export function CartDrawer({
  cart,
  isOpen,
  subtotal,
  onClose,
  onAdd,
  onRemove,
  onClear,
  minOrder
}: CartDrawerProps) {
  const [orderSent, setOrderSent] = useState(false);
  const safeMinOrder = Math.max(minOrder, 1);
  const remaining = Math.max(safeMinOrder - subtotal, 0);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className={`cartLayer ${isOpen ? "isOpen" : ""}`} aria-hidden={!isOpen}>
      <button className="cartBackdrop" type="button" onClick={onClose} />
      <aside className="cartPanel" aria-label="Корзина">
        <div className="cartHeader">
          <div>
            <span>Ваш заказ</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <button className="iconButton" type="button" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {cart.length ? (
          <div className="cartItems">
            {cart.map((item) => (
              <div className="cartItem" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.quantity} x {formatPrice(item.price)}
                  </span>
                </div>
                <div className="stepper" aria-label={`Количество ${item.name}`}>
                  <button type="button" onClick={() => onRemove(item.id)}>
                    <MinusIcon />
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => onAdd(item)}>
                    <PlusIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="emptyCart">
            <strong>Корзина пока пустая</strong>
            <p>Добавьте блюда из каталога, и они появятся здесь.</p>
          </div>
        )}

        <div className="minOrder">
          <div>
            <span>Минимальный заказ</span>
            <strong>{formatPrice(safeMinOrder)}</strong>
          </div>
          <div className="progressTrack">
            <span style={{ width: `${Math.min((subtotal / safeMinOrder) * 100, 100)}%` }} />
          </div>
          {remaining > 0 ? (
            <p>До минимального заказа осталось {formatPrice(remaining)}.</p>
          ) : (
            <p>Можно оформлять заказ.</p>
          )}
        </div>

        <form
          className="checkoutForm"
          onSubmit={(event) => {
            event.preventDefault();
            if (subtotal >= safeMinOrder && cart.length) {
              setOrderSent(true);
              onClear();
            }
          }}
        >
          <label>
            Имя
            <input name="name" placeholder="Мустафа" required />
          </label>
          <label>
            Телефон
            <input name="phone" placeholder="+7 999 000-00-00" required />
          </label>
          <label>
            Адрес доставки
            <textarea name="address" placeholder="Улица, дом, подъезд, этаж" rows={3} />
          </label>
          <button type="submit" disabled={subtotal < safeMinOrder || !cart.length}>
            Оформить заказ
          </button>
          {orderSent ? (
            <p className="formNote">Заявка собрана локально. Здесь позже можно подключить API.</p>
          ) : null}
        </form>
      </aside>
    </div>
  );
}
