import { PaymentResult } from "@/features/payment/ui/PaymentResult";

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
