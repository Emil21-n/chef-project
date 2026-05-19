"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";

import { formatSelectedOptions } from "@/entities/product/model/options";
import type { CartItem } from "@/features/cart/model/types";
import {
  createCheckoutOrder,
  CreateCheckoutOrderError
} from "@/features/checkout/api/create-order";
import { buildCheckoutOrder } from "@/features/checkout/model/build-order";
import type { CheckoutOrder } from "@/features/checkout/model/types";
import { formatPrice } from "@/shared/lib/format";
import { CloseIcon, MinusIcon, PlusIcon } from "@/shared/ui/icons";

type CartDrawerProps = {
  cart: CartItem[];
  isOpen: boolean;
  subtotal: number;
  onClose: () => void;
  onAdd: (cartKey: string) => void;
  onRemove: (cartKey: string) => void;
  onClear: () => void;
  minOrder: number;
};

type CheckoutFormState = {
  deliveryMethod: DeliveryMethod;
  deliveryTiming: "soon" | "scheduled";
  name: string;
  phone: string;
  street: string;
  house: string;
  entrance: string;
  apartment: string;
  floor: string;
  comment: string;
  deliveryDate: string;
  deliveryTime: string;
  privacyAccepted: boolean;
};

type CheckoutFormErrors = Partial<Record<keyof CheckoutFormState | "cart", string>>;

type DeliveryMethod = "pickup" | "delivery";

const PICKUP_METHOD_LABEL = "Самовывоз";
const DELIVERY_METHOD_LABEL = "Доставка по Москве (зона ограничена*)";
const DELIVERY_METHODS: { value: DeliveryMethod; label: string }[] = [
  { value: "pickup", label: PICKUP_METHOD_LABEL },
  { value: "delivery", label: DELIVERY_METHOD_LABEL }
];
const DELIVERY_TIMING_OPTIONS = [
  { value: "soon", label: "Как можно скорее" },
  { value: "scheduled", label: "Дата и время" }
] as const;

function getDeliveryMethodLabel(method: DeliveryMethod) {
  return method === "pickup" ? PICKUP_METHOD_LABEL : DELIVERY_METHOD_LABEL;
}

function getDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDeliveryDateTime(dateValue: string, timeValue: string) {
  const date = parseDateInput(dateValue);
  const formattedDate = date
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(date)
    : dateValue;

  return `${formattedDate}, ${timeValue}`;
}

function createInitialCheckoutForm(): CheckoutFormState {
  return {
    deliveryMethod: "delivery",
    deliveryTiming: "soon",
    name: "",
    phone: "",
    street: "",
    house: "",
    entrance: "",
    apartment: "",
    floor: "",
    comment: "",
    deliveryDate: getDateInputValue(),
    deliveryTime: "",
    privacyAccepted: false
  };
}

function getRussianPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("8")) return `7${digits.slice(1)}`.slice(0, 11);
  if (!digits.startsWith("7")) return `7${digits}`.slice(0, 11);

  return digits.slice(0, 11);
}

function formatRussianPhone(value: string) {
  const digits = getRussianPhoneDigits(value);

  if (!digits) return "";

  const localDigits = digits.slice(1);
  let formatted = "+7";

  if (localDigits.length) {
    formatted += ` (${localDigits.slice(0, 3)}`;
  }

  if (localDigits.length >= 3) {
    formatted += ")";
  }

  if (localDigits.length > 3) {
    formatted += ` ${localDigits.slice(3, 6)}`;
  }

  if (localDigits.length > 6) {
    formatted += `-${localDigits.slice(6, 8)}`;
  }

  if (localDigits.length > 8) {
    formatted += `-${localDigits.slice(8, 10)}`;
  }

  return formatted;
}

function validateCheckoutForm(
  form: CheckoutFormState,
  cart: CartItem[],
  subtotal: number,
  minOrder: number
) {
  const errors: CheckoutFormErrors = {};
  const phoneDigits = getRussianPhoneDigits(form.phone);

  if (!cart.length) {
    errors.cart = "Добавьте блюда в корзину перед оформлением заказа.";
  } else if (subtotal < minOrder) {
    errors.cart = `Минимальная сумма заказа ${formatPrice(minOrder)}.`;
  }

  if (!form.deliveryMethod) errors.deliveryMethod = "Выберите способ доставки.";
  if (!form.name.trim()) errors.name = "Укажите имя.";
  if (phoneDigits.length !== 11 || !phoneDigits.startsWith("7")) {
    errors.phone = "Введите телефон в формате +7 (000) 000-00-00.";
  }
  if (form.deliveryMethod === "delivery") {
    if (!form.street.trim()) errors.street = "Укажите улицу.";
    if (!form.house.trim()) errors.house = "Укажите дом.";
  }
  if (form.deliveryTiming === "scheduled") {
    const deliveryDate = parseDateInput(form.deliveryDate);
    const today = parseDateInput(getDateInputValue());

    if (!form.deliveryDate || !deliveryDate) {
      errors.deliveryDate = "Выберите дату доставки.";
    } else if (today && deliveryDate < today) {
      errors.deliveryDate = "Дата доставки не может быть раньше сегодняшней.";
    }
    if (!form.deliveryTime) {
      errors.deliveryTime = "Выберите время доставки.";
    }
  }
  if (!form.privacyAccepted) {
    errors.privacyAccepted = "Подтвердите согласие с политикой конфиденциальности.";
  }

  return errors;
}

function mapServerFieldErrors(fieldErrors: Record<string, string>) {
  return Object.entries(fieldErrors).reduce<CheckoutFormErrors>(
    (errors, [field, message]) => {
      if (field === "customer.name") errors.name = message;
      if (field === "customer.phone") errors.phone = message;
      if (field === "delivery.street") errors.street = message;
      if (field === "delivery.house") errors.house = message;
      if (field === "deliveryTime") errors.deliveryTime = message;
      if (field === "privacyAgreement") errors.privacyAccepted = message;
      if (field === "items" || field.startsWith("items.") || field === "totalAmount") {
        errors.cart = message;
      }

      return errors;
    },
    {}
  );
}

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
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutForm, setCheckoutForm] =
    useState<CheckoutFormState>(createInitialCheckoutForm);
  const [checkoutErrors, setCheckoutErrors] = useState<CheckoutFormErrors>({});
  const [submittedOrder, setSubmittedOrder] = useState<CheckoutOrder | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const deliveryDateMin = getDateInputValue();
  const safeMinOrder = Math.max(minOrder, 1);
  const remaining = Math.max(safeMinOrder - subtotal, 0);
  const canStartCheckout = cart.length > 0 && subtotal >= safeMinOrder;

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (cart.length) return;

    setCheckoutVisible(false);
    setSubmittedOrder(null);
  }, [cart.length]);

  const clearFieldError = (field: keyof CheckoutFormState | "cart") => {
    setCheckoutErrors((current) => {
      const next = { ...current };

      delete next[field];
      delete next.cart;

      return next;
    });
  };

  const handleCheckoutChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = event.target;
    const fieldName = name as keyof CheckoutFormState;
    const value =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : fieldName === "phone"
          ? formatRussianPhone(event.target.value)
          : event.target.value;

    setCheckoutForm((current) => ({
      ...current,
      [fieldName]: value
    }));
    setSubmitError("");
    clearFieldError(fieldName);
    if (fieldName === "deliveryTiming") {
      clearFieldError("deliveryDate");
      clearFieldError("deliveryTime");
    }
    if (fieldName === "deliveryMethod") {
      clearFieldError("street");
      clearFieldError("house");
      clearFieldError("deliveryDate");
      clearFieldError("deliveryTime");
    }
    setSubmittedOrder(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateCheckoutForm(checkoutForm, cart, subtotal, safeMinOrder);
    setCheckoutErrors(errors);
    setSubmitError("");

    if (Object.keys(errors).length) {
      return;
    }

    const isPickup = checkoutForm.deliveryMethod === "pickup";
    const deliveryTime =
      checkoutForm.deliveryTiming === "soon"
        ? "Как можно скорее"
        : formatDeliveryDateTime(checkoutForm.deliveryDate, checkoutForm.deliveryTime);

    const order = buildCheckoutOrder({
      customer: {
        name: checkoutForm.name.trim(),
        phone: formatRussianPhone(checkoutForm.phone)
      },
      delivery: {
        method: getDeliveryMethodLabel(checkoutForm.deliveryMethod),
        methodCode: checkoutForm.deliveryMethod,
        methodLabel: getDeliveryMethodLabel(checkoutForm.deliveryMethod),
        street: isPickup ? "" : checkoutForm.street.trim(),
        house: isPickup ? "" : checkoutForm.house.trim(),
        entrance: isPickup ? "" : checkoutForm.entrance.trim(),
        apartment: isPickup ? "" : checkoutForm.apartment.trim(),
        floor: isPickup ? "" : checkoutForm.floor.trim(),
        comment: checkoutForm.comment.trim()
      },
      deliveryTime,
      cart,
      totalAmount: subtotal,
      privacyAgreement: checkoutForm.privacyAccepted
    });

    setIsSubmittingOrder(true);

    try {
      const createdOrder = await createCheckoutOrder(order);

      console.info("Chef's Choice checkout order", createdOrder);
      setSubmittedOrder(createdOrder);
    } catch (error) {
      if (error instanceof CreateCheckoutOrderError) {
        setSubmitError(error.message);
        setCheckoutErrors((current) => ({
          ...current,
          ...mapServerFieldErrors(error.fieldErrors)
        }));
        return;
      }

      setSubmitError("Не удалось создать заказ. Попробуйте еще раз.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

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

        <div className="cartContent">
          {cart.length ? (
            <div className="cartItems">
              {cart.map((item) => {
                const selectedOptions = formatSelectedOptions(item.selectedOptions);

                return (
                  <div className="cartItem" key={item.cartKey}>
                    <div>
                      <strong>{item.name}</strong>
                      {selectedOptions ? (
                        <em className="cartItemOptions">{selectedOptions}</em>
                      ) : null}
                      <span>
                        {item.quantity} x {formatPrice(item.price)}
                      </span>
                    </div>
                    <div className="stepper" aria-label={`Количество ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setSubmittedOrder(null);
                          onRemove(item.cartKey);
                        }}
                      >
                        <MinusIcon />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSubmittedOrder(null);
                          onAdd(item.cartKey);
                        }}
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
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
              <span
                style={{ width: `${Math.min((subtotal / safeMinOrder) * 100, 100)}%` }}
              />
            </div>
            {remaining > 0 ? (
              <p>До минимального заказа осталось {formatPrice(remaining)}.</p>
            ) : (
              <p>Можно оформлять заказ.</p>
            )}
            {checkoutErrors.cart ? (
              <p className="fieldError" role="alert">
                {checkoutErrors.cart}
              </p>
            ) : null}
          </div>

          {submittedOrder ? (
            <div className="orderSuccess" role="status">
              <span>Заказ создан</span>
              <strong>{submittedOrder.orderNumber || submittedOrder.id}</strong>
              <p>
                Мы приняли заказ. Сумма:
                {" "}
                {formatPrice(submittedOrder.totalAmount)}. Оплата: ожидает.
              </p>
              <div>
                <button type="button" onClick={onClose}>
                  Закрыть
                </button>
                <button
                  className="secondaryCheckoutButton"
                  type="button"
                  onClick={() => {
                    onClear();
                    setCheckoutVisible(false);
                    setSubmittedOrder(null);
                    setSubmitError("");
                    setCheckoutForm(createInitialCheckoutForm());
                  }}
                >
                  Очистить корзину
                </button>
              </div>
            </div>
          ) : null}

          {checkoutVisible && !submittedOrder ? (
            <form
              className="checkoutForm"
              onSubmit={handleSubmit}
              noValidate
              aria-busy={isSubmittingOrder}
            >
              <label className="checkoutField checkoutFieldWide">
                Способ доставки
                <select
                  name="deliveryMethod"
                  value={checkoutForm.deliveryMethod}
                  onChange={handleCheckoutChange}
                  aria-invalid={Boolean(checkoutErrors.deliveryMethod)}
                >
                  {DELIVERY_METHODS.map((method) => (
                    <option value={method.value} key={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                {checkoutErrors.deliveryMethod ? (
                  <span className="fieldError">{checkoutErrors.deliveryMethod}</span>
                ) : null}
              </label>

              <div className="checkoutFieldGrid">
                <label className="checkoutField">
                  Имя
                  <input
                    name="name"
                    value={checkoutForm.name}
                    placeholder="Имя"
                    onChange={handleCheckoutChange}
                    aria-invalid={Boolean(checkoutErrors.name)}
                  />
                  {checkoutErrors.name ? (
                    <span className="fieldError">{checkoutErrors.name}</span>
                  ) : null}
                </label>

                <label className="checkoutField">
                  Телефон
                  <input
                    name="phone"
                    value={checkoutForm.phone}
                    inputMode="tel"
                    placeholder="+7 (000) 000-00-00"
                    onChange={handleCheckoutChange}
                    aria-invalid={Boolean(checkoutErrors.phone)}
                  />
                  {checkoutErrors.phone ? (
                    <span className="fieldError">{checkoutErrors.phone}</span>
                  ) : null}
                </label>
              </div>

              {checkoutForm.deliveryMethod === "delivery" ? (
                <>
                  <label className="checkoutField checkoutFieldWide">
                    Улица
                    <input
                      name="street"
                      value={checkoutForm.street}
                      placeholder="Улица"
                      onChange={handleCheckoutChange}
                      aria-invalid={Boolean(checkoutErrors.street)}
                    />
                    {checkoutErrors.street ? (
                      <span className="fieldError">{checkoutErrors.street}</span>
                    ) : null}
                  </label>

                  <div className="checkoutAddressGrid">
                    <label className="checkoutField">
                      Дом
                      <input
                        name="house"
                        value={checkoutForm.house}
                        placeholder="Дом"
                        onChange={handleCheckoutChange}
                        aria-invalid={Boolean(checkoutErrors.house)}
                      />
                      {checkoutErrors.house ? (
                        <span className="fieldError">{checkoutErrors.house}</span>
                      ) : null}
                    </label>

                    <label className="checkoutField">
                      Подъезд
                      <input
                        name="entrance"
                        value={checkoutForm.entrance}
                        placeholder="Подъезд"
                        onChange={handleCheckoutChange}
                      />
                    </label>

                    <label className="checkoutField">
                      Кв/оф
                      <input
                        name="apartment"
                        value={checkoutForm.apartment}
                        placeholder="Кв/оф"
                        onChange={handleCheckoutChange}
                      />
                    </label>

                    <label className="checkoutField">
                      Этаж
                      <input
                        name="floor"
                        value={checkoutForm.floor}
                        placeholder="Этаж"
                        onChange={handleCheckoutChange}
                      />
                    </label>
                  </div>
                </>
              ) : null}

              <label className="checkoutField checkoutFieldWide">
                Комментарий
                <textarea
                  name="comment"
                  value={checkoutForm.comment}
                  placeholder="Комментарий"
                  rows={3}
                  onChange={handleCheckoutChange}
                />
              </label>

              <fieldset className="deliveryTimingGroup">
                <legend>Время доставки</legend>
                <div className="deliveryTimingOptions">
                  {DELIVERY_TIMING_OPTIONS.map((option) => (
                    <label className="deliveryTimingOption" key={option.value}>
                      <input
                        name="deliveryTiming"
                        type="radio"
                        value={option.value}
                        checked={checkoutForm.deliveryTiming === option.value}
                        onChange={handleCheckoutChange}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {checkoutForm.deliveryTiming === "scheduled" ? (
                <div className="checkoutDeliveryGrid">
                  <label className="checkoutField">
                    Дата доставки
                    <input
                      name="deliveryDate"
                      type="date"
                      value={checkoutForm.deliveryDate}
                      min={deliveryDateMin}
                      onChange={handleCheckoutChange}
                      aria-invalid={Boolean(checkoutErrors.deliveryDate)}
                    />
                    {checkoutErrors.deliveryDate ? (
                      <span className="fieldError">{checkoutErrors.deliveryDate}</span>
                    ) : null}
                  </label>

                  <label className="checkoutField">
                    Время доставки
                    <input
                      name="deliveryTime"
                      type="time"
                      value={checkoutForm.deliveryTime}
                      step={900}
                      onChange={handleCheckoutChange}
                      aria-invalid={Boolean(checkoutErrors.deliveryTime)}
                    />
                    {checkoutErrors.deliveryTime ? (
                      <span className="fieldError">{checkoutErrors.deliveryTime}</span>
                    ) : null}
                  </label>
                </div>
              ) : null}

              <label className="privacyCheck">
                <input
                  name="privacyAccepted"
                  type="checkbox"
                  checked={checkoutForm.privacyAccepted}
                  onChange={handleCheckoutChange}
                  aria-invalid={Boolean(checkoutErrors.privacyAccepted)}
                />
                <span>
                  Я согласен с{" "}
                  <a href="/privacy-policy" target="_blank" rel="noreferrer">
                    политикой конфиденциальности
                  </a>
                </span>
              </label>
              {checkoutErrors.privacyAccepted ? (
                <span className="fieldError">{checkoutErrors.privacyAccepted}</span>
              ) : null}

              {submitError ? (
                <p className="fieldError" role="alert">
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!cart.length || subtotal < safeMinOrder || isSubmittingOrder}
              >
                {isSubmittingOrder ? "Отправляем..." : "Заказать"}
              </button>
            </form>
          ) : null}
        </div>

        {!checkoutVisible ? (
          <div className="cartCheckoutBar">
            <button
              type="button"
              disabled={!canStartCheckout}
              onClick={() => {
                setCheckoutVisible(true);
                setCheckoutErrors({});
                setSubmittedOrder(null);
                setSubmitError("");
              }}
            >
              Заказать
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
