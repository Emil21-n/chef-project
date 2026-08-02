"use client";

import { useEffect, useState } from "react";

type PaymentState =
  | "checking"
  | "pending"
  | "paid"
  | "paid-test"
  | "paid-delayed"
  | "cancelled"
  | "failed";

type PaymentResultProps = {
  orderNumber: string;
};

type StatusPayload = {
  paymentStatus?: string;
  notificationStatus?: string;
};

const MAX_ATTEMPTS = 15;

export function PaymentResult({ orderNumber }: PaymentResultProps) {
  const [state, setState] = useState<PaymentState>(orderNumber ? "checking" : "failed");

  useEffect(() => {
    if (!orderNumber) return;

    let attempt = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const checkStatus = async () => {
      attempt += 1;

      try {
        const response = await fetch(
          `/api/payments/yookassa/status?order=${encodeURIComponent(orderNumber)}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as StatusPayload;

        if (!response.ok) throw new Error("Unable to read payment status.");
        if (cancelled) return;

        if (payload.paymentStatus === "paid") {
          setState(
            payload.notificationStatus === "sent"
              ? "paid"
              : payload.notificationStatus === "skipped_test"
                ? "paid-test"
                : "paid-delayed"
          );
          return;
        }

        if (
          payload.paymentStatus === "cancelled" ||
          payload.paymentStatus === "failed" ||
          payload.paymentStatus === "refunded"
        ) {
          setState("cancelled");
          return;
        }

        setState("pending");

        if (attempt < MAX_ATTEMPTS) {
          timeout = setTimeout(checkStatus, 2_000);
        }
      } catch {
        if (!cancelled) setState("failed");
      }
    };

    void checkStatus();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [orderNumber]);

  const content = {
    checking: {
      label: "Проверяем оплату",
      title: "Получаем статус платежа",
      text: "Это обычно занимает несколько секунд. Не закрывайте страницу."
    },
    pending: {
      label: "Платёж обрабатывается",
      title: "Ожидаем подтверждение банка",
      text: "Если деньги уже списались, статус обновится автоматически."
    },
    paid: {
      label: "Оплата прошла",
      title: "Заказ подтверждён",
      text: "Мы получили оплату и передали заказ менеджеру ресторана."
    },
    "paid-test": {
      label: "Тестовая оплата прошла",
      title: "Платёжный сценарий проверен",
      text: "Тестовый заказ сохранён, но уведомление ресторану намеренно не отправлялось."
    },
    "paid-delayed": {
      label: "Оплата прошла",
      title: "Уведомление задерживается",
      text: "Платёж подтверждён, но уведомление ресторана пока не доставлено. Свяжитесь с рестораном и назовите номер заказа."
    },
    cancelled: {
      label: "Оплата не завершена",
      title: "Платёж отменён",
      text: "Деньги не списаны. Вернитесь в меню и оформите заказ заново."
    },
    failed: {
      label: "Не удалось проверить",
      title: "Статус платежа недоступен",
      text: "Попробуйте обновить страницу. Если деньги списались, свяжитесь с рестораном."
    }
  }[state];

  return (
    <main className="paymentResultPage">
      <section className={`paymentResultCard is-${state}`} aria-live="polite">
        <span>{content.label}</span>
        <h1>{content.title}</h1>
        {orderNumber ? <strong>Заказ {orderNumber}</strong> : null}
        <p>{content.text}</p>
        <div>
          {(state === "failed" || state === "pending" || state === "paid-delayed") ? (
            <button type="button" onClick={() => window.location.reload()}>
              Проверить ещё раз
            </button>
          ) : null}
          <a href="/">Вернуться в меню</a>
        </div>
      </section>
    </main>
  );
}
