import type { Metadata } from "next";

import { PaymentResult } from "@/features/payment/ui/PaymentResult";

export const metadata: Metadata = {
  title: "Статус оплаты",
  description: "Статус оплаты заказа Chef's Choice.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true
  }
};

type PaymentPageProps = {
  searchParams: Promise<{
    order?: string | string[];
  }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const params = await searchParams;
  const orderNumber = Array.isArray(params.order) ? params.order[0] : params.order || "";

  return <PaymentResult orderNumber={orderNumber} />;
}
