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

function readObject(value: unknown): StrapiRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as StrapiRecord)
    : {};
}

function readItems(value: unknown): CheckoutOrderItem[] {
  return Array.isArray(value) ? (value as CheckoutOrderItem[]) : [];
}

function buildStoredOrder(record: StrapiRecord): CheckoutOrder {
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

async function sendPaidOrderNotification(record: StrapiRecord, paymentData: StrapiRecord) {
  try {
    await sendOrderEmail(buildStoredOrder({
      ...record,
      orderStatus: "confirmed",
      paymentStatus: "paid",
      payment: paymentData
    }));

    await updateOrder(record, {
      payment: {
        ...paymentData,
        notificationEmailStatus: "sent",
        notificationEmailSentAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Unable to send paid order notification email", getOrderEmailErrorDetails(error));
  }
}

export async function reconcileYooKassaPayment(payment: YooKassaPayment) {
  const orderNumber = payment.metadata?.order_number;

  if (!orderNumber) {
    throw new Error("YooKassa payment does not contain order_number metadata.");
  }

  const record = await findOrderByNumber(orderNumber);

  if (!record) {
    throw new Error(`Order ${orderNumber} was not found.`);
  }

  validatePaymentForOrder(payment, record);

  const previousPaymentStatus = stringValue(record.paymentStatus);
  const storedPayment = readObject(record.payment);
  const paymentStatus = getCheckoutPaymentStatus(payment);
  const orderStatus = paymentStatus === "refunded" && record.orderStatus === "completed"
    ? "completed"
    : getCheckoutOrderStatus(payment);
  const paymentData = {
    ...storedPayment,
    provider: "yookassa",
    status: paymentStatus,
    externalPaymentId: payment.id,
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

  if (paymentStatus === "paid" && previousPaymentStatus !== "paid") {
    await sendPaidOrderNotification({ ...record, ...updatedRecord }, paymentData);
  }

  return buildStoredOrder({ ...record, ...updatedRecord, payment: paymentData });
}

export async function reconcileYooKassaRefund(refund: YooKassaRefund, payment: YooKassaPayment) {
  if (refund.status !== "succeeded" || refund.payment_id !== payment.id) {
    throw new Error("YooKassa refund is not successful or has an invalid payment id.");
  }

  const orderNumber = payment.metadata?.order_number;
  const record = orderNumber ? await findOrderByNumber(orderNumber) : null;

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
}
