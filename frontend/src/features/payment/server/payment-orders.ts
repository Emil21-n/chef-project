import "server-only";

import type {
  CheckoutOrder,
  CheckoutOrderItem,
  CheckoutPayment
} from "@/features/checkout/model/types";
import {
  getOrderEmailErrorDetails,
  sendOrderEmail
} from "@/features/checkout/server/send-order-email";
import {
  getCheckoutOrderStatus,
  getCheckoutPaymentStatus,
  type YooKassaPayment,
  type YooKassaRefund
} from "@/features/payment/server/yookassa";
import {
  fetchFromStrapi,
  numberValue,
  stringValue,
  type StrapiRecord,
  unwrapCollection,
  unwrapData,
  unwrapRecord
} from "@/shared/api/strapi";

const orderLocks = new Map<string, Promise<unknown>>();
const NOTIFICATION_RETRY_DELAY_MS = 5 * 60 * 1000;
const NOTIFICATION_SENDING_TIMEOUT_MS = 10 * 60 * 1000;

export class OrderNotificationError extends Error {
  constructor(orderNumber: string) {
    super(`Unable to deliver notification for paid order ${orderNumber}.`);
    this.name = "OrderNotificationError";
  }
}

function readObject(value: unknown): StrapiRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as StrapiRecord)
    : {};
}

function readItems(value: unknown): CheckoutOrderItem[] {
  return Array.isArray(value) ? (value as CheckoutOrderItem[]) : [];
}

export function buildStoredOrder(record: StrapiRecord): CheckoutOrder {
  const customer = readObject(record.customer);
  const delivery = readObject(record.delivery);
  const payment = readObject(record.payment);
  const orderNumber = stringValue(record.orderNumber);

  return {
    id: orderNumber,
    orderNumber,
    strapiDocumentId: stringValue(record.documentId, String(record.id || "")),
    customer: {
      name: stringValue(customer.name),
      phone: stringValue(customer.phone),
      email: stringValue(customer.email)
    },
    delivery: {
      method: stringValue(delivery.method),
      methodCode: delivery.methodCode === "pickup" ? "pickup" : "delivery",
      methodLabel: stringValue(delivery.methodLabel),
      street: stringValue(delivery.street),
      house: stringValue(delivery.house),
      entrance: stringValue(delivery.entrance),
      apartment: stringValue(delivery.apartment),
      floor: stringValue(delivery.floor),
      comment: stringValue(delivery.comment)
    },
    deliveryTime: stringValue(record.deliveryTime),
    items: readItems(record.items),
    totalAmount: numberValue(record.totalAmount),
    currency: stringValue(record.currency, "RUB"),
    status: record.orderStatus as CheckoutOrder["status"],
    paymentStatus: record.paymentStatus as CheckoutOrder["paymentStatus"],
    payment: {
      provider: payment.provider === "yookassa" ? "yookassa" : "none",
      status: (stringValue(payment.status, "unpaid") as CheckoutPayment["status"]),
      redirectUrl: stringValue(payment.redirectUrl) || null,
      externalPaymentId: stringValue(payment.externalPaymentId) || null,
      test: payment.test === true,
      receiptRegistration: stringValue(payment.receiptRegistration) || null
    },
    privacyAgreement: record.privacyAgreement === true,
    createdAt: stringValue(record.createdAt, new Date().toISOString())
  };
}

export async function findOrderByNumber(orderNumber: string) {
  const params = new URLSearchParams({
    "filters[orderNumber][$eq]": orderNumber,
    "pagination[pageSize]": "1"
  });
  const response = await fetchFromStrapi(`/api/orders?${params.toString()}`);

  return unwrapCollection(response)[0] || null;
}

function validatePaymentForOrder(payment: YooKassaPayment, record: StrapiRecord) {
  const orderNumber = stringValue(record.orderNumber);
  const storedPayment = readObject(record.payment);
  const storedPaymentId = stringValue(storedPayment.externalPaymentId);
  const expectedAmount = numberValue(record.totalAmount).toFixed(2);

  if (payment.metadata?.order_number !== orderNumber) {
    throw new Error("YooKassa payment metadata does not match the order.");
  }

  if (storedPaymentId && storedPaymentId !== payment.id) {
    throw new Error("YooKassa payment id does not match the stored order payment.");
  }

  if (payment.amount.currency !== "RUB" || payment.amount.value !== expectedAmount) {
    throw new Error("YooKassa payment amount does not match the order total.");
  }
}

async function updateOrder(record: StrapiRecord, data: StrapiRecord) {
  const documentId = stringValue(record.documentId, String(record.id || ""));

  if (!documentId) {
    throw new Error("Unable to update order without a Strapi document id.");
  }

  const response = await fetchFromStrapi(`/api/orders/${encodeURIComponent(documentId)}`, undefined, {
    method: "PUT",
    body: JSON.stringify({ data })
  });

  return unwrapRecord(unwrapData(response));
}

async function withOrderLock<T>(orderNumber: string, task: () => Promise<T>): Promise<T> {
  const previous = orderLocks.get(orderNumber) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);

  orderLocks.set(orderNumber, next);

  try {
    return await next;
  } finally {
    if (orderLocks.get(orderNumber) === next) {
      orderLocks.delete(orderNumber);
    }
  }
}

async function sendPaidOrderNotificationWithinLock(record: StrapiRecord, paymentData: StrapiRecord) {
  const orderNumber = stringValue(record.orderNumber);

  if (!orderNumber) {
    throw new Error("Unable to notify about a paid order without an order number.");
  }

  const freshRecord = await findOrderByNumber(orderNumber);

  if (!freshRecord) {
    throw new Error(`Order ${orderNumber} was not found before email notification.`);
  }

  const freshPayment = {
    ...paymentData,
    ...readObject(freshRecord.payment)
  };

  if (
    freshPayment.notificationEmailStatus === "sent" ||
    freshPayment.notificationEmailStatus === "skipped_test"
  ) return;

  if (freshPayment.notificationEmailStatus === "sending") {
    const attemptedAt = Date.parse(stringValue(freshPayment.notificationEmailAttemptedAt));

    if (
      !Number.isFinite(attemptedAt) ||
      Date.now() - attemptedAt < NOTIFICATION_SENDING_TIMEOUT_MS
    ) {
      throw new OrderNotificationError(orderNumber);
    }
  }

  if (freshPayment.test === true) {
    await updateOrder(freshRecord, {
      payment: {
        ...freshPayment,
        notificationEmailStatus: "skipped_test",
        notificationEmailCheckedAt: new Date().toISOString()
      }
    });
    return;
  }

  const failedAt = Date.parse(stringValue(freshPayment.notificationEmailFailedAt));

  if (
    freshPayment.notificationEmailStatus === "failed" &&
    Number.isFinite(failedAt) &&
    Date.now() - failedAt < NOTIFICATION_RETRY_DELAY_MS
  ) {
    throw new OrderNotificationError(orderNumber);
  }

  const attemptingPayment = {
    ...freshPayment,
    notificationEmailStatus: "sending",
    notificationEmailAttemptedAt: new Date().toISOString(),
    notificationEmailAttemptCount: numberValue(freshPayment.notificationEmailAttemptCount) + 1
  };
  const attemptingRecord = await updateOrder(freshRecord, {
    payment: attemptingPayment
  });

  try {
    await sendOrderEmail(buildStoredOrder({
      ...freshRecord,
      ...attemptingRecord,
      orderStatus: "confirmed",
      paymentStatus: "paid",
      payment: attemptingPayment
    }));
  } catch (error) {
    await updateOrder(attemptingRecord, {
      payment: {
        ...attemptingPayment,
        notificationEmailStatus: "failed",
        notificationEmailFailedAt: new Date().toISOString()
      }
    }).catch((updateError) => {
      console.error("Unable to persist paid order email failure", updateError);
    });
    console.error("Unable to send paid order notification email", getOrderEmailErrorDetails(error));
    throw new OrderNotificationError(orderNumber);
  }

  try {
    await updateOrder(attemptingRecord, {
      payment: {
        ...attemptingPayment,
        notificationEmailStatus: "sent",
        notificationEmailSentAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Email was accepted but its delivery status could not be persisted", error);
    throw new OrderNotificationError(orderNumber);
  }
}

export async function reconcileYooKassaPayment(payment: YooKassaPayment) {
  const orderNumber = payment.metadata?.order_number;

  if (!orderNumber) {
    throw new Error("YooKassa payment does not contain order_number metadata.");
  }

  return withOrderLock(orderNumber, async () => {
    const record = await findOrderByNumber(orderNumber);

    if (!record) {
      throw new Error(`Order ${orderNumber} was not found.`);
    }

    validatePaymentForOrder(payment, record);

    const storedPayment = readObject(record.payment);
    const paymentStatus = getCheckoutPaymentStatus(payment);

    if (
      record.paymentStatus === "refunded" && paymentStatus !== "refunded" ||
      record.paymentStatus === "paid" && paymentStatus !== "paid" && paymentStatus !== "refunded" ||
      record.paymentStatus === "cancelled" && paymentStatus === "pending"
    ) {
      return buildStoredOrder(record);
    }

    const orderStatus = record.orderStatus === "completed" &&
      (paymentStatus === "paid" || paymentStatus === "refunded")
      ? "completed"
      : getCheckoutOrderStatus(payment);
    const paymentData = {
      ...storedPayment,
      provider: "yookassa",
      status: paymentStatus,
      externalPaymentId: payment.id,
      redirectUrl: paymentStatus === "pending"
        ? payment.confirmation?.confirmation_url || storedPayment.redirectUrl || null
        : null,
      test: payment.test,
      receiptRegistration: payment.receipt_registration || null,
      refundedAmount: payment.refunded_amount?.value || null,
      cancellationReason: payment.cancellation_details?.reason || null,
      capturedAt: payment.captured_at || null,
      checkedAt: new Date().toISOString()
    };
    const updatedRecord = await updateOrder(record, {
      orderStatus,
      paymentStatus,
      paymentProvider: "yookassa",
      payment: paymentData
    });

    if (paymentStatus === "paid") {
      await sendPaidOrderNotificationWithinLock({ ...record, ...updatedRecord }, paymentData);
    }

    return buildStoredOrder({ ...record, ...updatedRecord, payment: paymentData });
  });
}

export async function reconcileYooKassaRefund(refund: YooKassaRefund, payment: YooKassaPayment) {
  if (refund.status !== "succeeded" || refund.payment_id !== payment.id) {
    throw new Error("YooKassa refund is not successful or has an invalid payment id.");
  }

  const orderNumber = payment.metadata?.order_number;

  if (!orderNumber) {
    throw new Error("Order for YooKassa refund was not found.");
  }

  return withOrderLock(orderNumber, async () => {
    const record = await findOrderByNumber(orderNumber);

    if (!record) {
      throw new Error("Order for YooKassa refund was not found.");
    }

    validatePaymentForOrder(payment, record);
    const storedPayment = readObject(record.payment);
    const fullyRefunded = payment.refunded_amount
      ? Number(payment.refunded_amount.value) >= Number(payment.amount.value)
      : Number(refund.amount.value) >= Number(payment.amount.value);
    const paymentData = {
      ...storedPayment,
      provider: "yookassa",
      status: fullyRefunded ? "refunded" : "paid",
      externalPaymentId: payment.id,
      lastRefundId: refund.id,
      lastRefundAmount: refund.amount.value,
      refundedAmount: payment.refunded_amount?.value || refund.amount.value,
      refundedAt: refund.created_at || new Date().toISOString(),
      checkedAt: new Date().toISOString()
    };
    const updatedRecord = await updateOrder(record, {
      orderStatus: fullyRefunded && record.orderStatus !== "completed" ? "cancelled" : record.orderStatus,
      paymentStatus: fullyRefunded ? "refunded" : "paid",
      paymentProvider: "yookassa",
      payment: paymentData
    });

    return buildStoredOrder({ ...record, ...updatedRecord, payment: paymentData });
  });
}
