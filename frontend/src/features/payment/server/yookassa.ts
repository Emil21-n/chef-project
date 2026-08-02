import "server-only";

import type { CheckoutOrderItem } from "@/features/checkout/model/types";

const YOOKASSA_API_URL = "https://api.yookassa.ru/v3";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REQUEST_ATTEMPTS = 3;

type YooKassaAmount = {
  value: string;
  currency: string;
};

export type YooKassaPayment = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  test: boolean;
  amount: YooKassaAmount;
  refunded_amount?: YooKassaAmount;
  confirmation?: {
    type?: string;
    confirmation_url?: string;
  };
  metadata?: Record<string, string>;
  receipt_registration?: string;
  cancellation_details?: {
    party?: string;
    reason?: string;
  };
  created_at?: string;
  captured_at?: string;
};

export type YooKassaRefund = {
  id: string;
  payment_id: string;
  status: "pending" | "succeeded" | "canceled";
  amount: YooKassaAmount;
  created_at?: string;
};

type CreatePaymentInput = {
  orderNumber: string;
  orderDocumentId: string;
  customer: {
    email: string;
  };
  items: CheckoutOrderItem[];
  totalAmount: number;
};

type YooKassaConfig = {
  shopId: string;
  secretKey: string;
  siteUrl: string;
  receiptsEnabled: boolean;
  vatCode: number;
  paymentMode: string;
  paymentSubject: string;
};

export class YooKassaRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "YooKassaRequestError";
    this.status = status;
  }
}

function requireEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

function getConfig(): YooKassaConfig {
  const rawVatCode = process.env.YOOKASSA_VAT_CODE || "1";
  const vatCode = Number(rawVatCode);

  if (!Number.isInteger(vatCode) || vatCode < 1 || vatCode > 12) {
    throw new Error(`YOOKASSA_VAT_CODE must be an integer from 1 to 12. Current value: ${rawVatCode}`);
  }

  return {
    shopId: requireEnvironmentValue("YOOKASSA_SHOP_ID"),
    secretKey: requireEnvironmentValue("YOOKASSA_SECRET_KEY"),
    siteUrl: requireEnvironmentValue("SITE_URL").replace(/\/$/, ""),
    receiptsEnabled: process.env.YOOKASSA_RECEIPTS_ENABLED !== "false",
    vatCode,
    paymentMode: process.env.YOOKASSA_PAYMENT_MODE?.trim() || "full_payment",
    paymentSubject: process.env.YOOKASSA_PAYMENT_SUBJECT?.trim() || "commodity"
  };
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function createAuthorizationHeader(config: YooKassaConfig) {
  return `Basic ${Buffer.from(`${config.shopId}:${config.secretKey}`).toString("base64")}`;
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {
      description?: string;
      parameter?: string;
      code?: string;
    };
    const parts = [payload.code, payload.description, payload.parameter && `parameter: ${payload.parameter}`];

    return parts.filter(Boolean).join(" — ") || response.statusText;
  } catch {
    return response.statusText;
  }
}

async function requestYooKassa<T>(
  path: string,
  init: RequestInit = {},
  idempotenceKey?: string
) {
  const config = getConfig();
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");
  headers.set("Authorization", createAuthorizationHeader(config));

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (idempotenceKey) {
    headers.set("Idempotence-Key", idempotenceKey);
  }

  const canRetry = init.method !== "POST" || Boolean(idempotenceKey);

  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(`${YOOKASSA_API_URL}${path}`, {
        ...init,
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      if (!canRetry || attempt === MAX_REQUEST_ATTEMPTS) throw error;

      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
      continue;
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (canRetry && attempt < MAX_REQUEST_ATTEMPTS && response.status >= 500) {
      await response.arrayBuffer().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
      continue;
    }

    throw new YooKassaRequestError(
      `YooKassa request failed: ${response.status} ${await readErrorMessage(response)}`,
      response.status
    );
  }

  throw new Error("YooKassa request retry loop exited unexpectedly.");
}

export async function createYooKassaPayment(input: CreatePaymentInput) {
  const config = getConfig();
  const receipt = config.receiptsEnabled
    ? {
        customer: {
          email: input.customer.email
        },
        items: input.items.map((item) => ({
          description: item.name.slice(0, 128),
          quantity: item.quantity.toFixed(3),
          amount: {
            value: formatAmount(item.price),
            currency: "RUB"
          },
          vat_code: config.vatCode,
          payment_mode: config.paymentMode,
          payment_subject: config.paymentSubject
        }))
      }
    : undefined;
  const body = {
    amount: {
      value: formatAmount(input.totalAmount),
      currency: "RUB"
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: `${config.siteUrl}/payment?order=${encodeURIComponent(input.orderNumber)}`
    },
    description: `Заказ ${input.orderNumber}`.slice(0, 128),
    metadata: {
      order_number: input.orderNumber,
      order_document_id: input.orderDocumentId
    },
    receipt
  };

  return requestYooKassa<YooKassaPayment>(
    "/payments",
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    input.orderNumber
  );
}

export function getYooKassaPayment(paymentId: string) {
  return requestYooKassa<YooKassaPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export function getYooKassaRefund(refundId: string) {
  return requestYooKassa<YooKassaRefund>(`/refunds/${encodeURIComponent(refundId)}`);
}

export function getCheckoutPaymentStatus(payment: YooKassaPayment) {
  if (isYooKassaPaymentFullyRefunded(payment)) return "refunded" as const;
  if (payment.status === "succeeded") return "paid" as const;
  if (payment.status === "canceled") return "cancelled" as const;

  return "pending" as const;
}

export function getCheckoutOrderStatus(payment: YooKassaPayment) {
  if (isYooKassaPaymentFullyRefunded(payment)) return "cancelled" as const;
  if (payment.status === "succeeded") return "confirmed" as const;
  if (payment.status === "canceled") return "cancelled" as const;

  return "pending" as const;
}

export function isYooKassaPaymentFullyRefunded(payment: YooKassaPayment) {
  if (!payment.refunded_amount || payment.refunded_amount.currency !== payment.amount.currency) {
    return false;
  }

  return Number(payment.refunded_amount.value) >= Number(payment.amount.value);
}
