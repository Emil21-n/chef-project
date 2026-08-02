import { NextResponse } from "next/server";

import {
  findOrderByNumber,
  OrderNotificationError,
  reconcileYooKassaPayment
} from "@/features/payment/server/payment-orders";
import { getYooKassaPayment } from "@/features/payment/server/yookassa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNotificationStatus(record: Record<string, unknown>) {
  const status = readObject(record.payment).notificationEmailStatus;
  return typeof status === "string" ? status : "pending";
}

export async function GET(request: Request) {
  const orderNumber = new URL(request.url).searchParams.get("order")?.trim() || "";

  if (!/^CC-\d{8}-(?:[A-F0-9]{8}|[A-F0-9]{32})$/.test(orderNumber)) {
    return NextResponse.json({ message: "Invalid order number." }, { status: 400 });
  }

  try {
    const record = await findOrderByNumber(orderNumber);

    if (!record) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
    }

    const storedPayment = readObject(record.payment);
    const paymentId = typeof storedPayment.externalPaymentId === "string"
      ? storedPayment.externalPaymentId
      : "";

    if (!paymentId) {
      return NextResponse.json({
        orderNumber,
        paymentStatus: record.paymentStatus || "unpaid",
        orderStatus: record.orderStatus || "created",
        notificationStatus: readNotificationStatus(record)
      });
    }

    const payment = await getYooKassaPayment(paymentId);
    const order = await reconcileYooKassaPayment(payment);
    const reconciledRecord = await findOrderByNumber(orderNumber);

    return NextResponse.json({
      orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      notificationStatus: reconciledRecord
        ? readNotificationStatus(reconciledRecord)
        : "pending"
    });
  } catch (error) {
    if (error instanceof OrderNotificationError) {
      const record = await findOrderByNumber(orderNumber).catch(() => null);

      if (record) {
        return NextResponse.json({
          orderNumber,
          paymentStatus: record.paymentStatus || "paid",
          orderStatus: record.orderStatus || "confirmed",
          notificationStatus: readNotificationStatus(record)
        });
      }
    }

    console.error("Unable to check YooKassa payment status", error);
    return NextResponse.json({ message: "Unable to check payment status." }, { status: 502 });
  }
}
