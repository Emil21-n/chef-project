import { NextResponse } from "next/server";

import {
  reconcileYooKassaPayment,
  reconcileYooKassaRefund
} from "@/features/payment/server/payment-orders";
import {
  getYooKassaPayment,
  getYooKassaRefund
} from "@/features/payment/server/yookassa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WebhookBody = {
  type?: string;
  event?: string;
  object?: {
    id?: string;
    payment_id?: string;
  };
};

export async function POST(request: Request) {
  let body: WebhookBody;

  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
  }

  if (body.type !== "notification" || !body.event || !body.object?.id) {
    return NextResponse.json({ message: "Invalid notification." }, { status: 400 });
  }

  try {
    if (body.event === "refund.succeeded") {
      const refund = await getYooKassaRefund(body.object.id);
      const payment = await getYooKassaPayment(refund.payment_id);

      await reconcileYooKassaRefund(refund, payment);
      return NextResponse.json({ received: true });
    }

    if (
      body.event === "payment.succeeded" ||
      body.event === "payment.canceled" ||
      body.event === "payment.waiting_for_capture"
    ) {
      // YooKassa notifications are verified by retrieving the current object
      // directly from the API before any order state is changed.
      const payment = await getYooKassaPayment(body.object.id);

      await reconcileYooKassaPayment(payment);
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true, ignored: true });
  } catch (error) {
    console.error("Unable to process YooKassa webhook", error);
    return NextResponse.json({ message: "Unable to process notification." }, { status: 500 });
  }
}
