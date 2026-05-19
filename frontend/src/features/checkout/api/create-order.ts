import type { CheckoutOrder } from "@/features/checkout/model/types";

type CreateOrderPayload = {
  order?: CheckoutOrder;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export class CreateCheckoutOrderError extends Error {
  fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "CreateCheckoutOrderError";
    this.fieldErrors = fieldErrors;
  }
}

export async function createCheckoutOrder(order: CheckoutOrder) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(order)
  });

  let payload: CreateOrderPayload = {};

  try {
    payload = (await response.json()) as CreateOrderPayload;
  } catch {
    // The fallback message below is clearer than surfacing an empty parse error.
  }

  if (!response.ok || !payload.order) {
    throw new CreateCheckoutOrderError(
      payload.message || "Не удалось создать заказ. Попробуйте еще раз.",
      payload.fieldErrors
    );
  }

  return payload.order;
}
