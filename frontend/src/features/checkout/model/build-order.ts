import type {
  BuildCheckoutOrderInput,
  CheckoutOrder
} from "@/features/checkout/model/types";

export function createCheckoutOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").toUpperCase();

  return `CC-${datePart}-${suffix}`;
}

export function buildCheckoutOrder({
  orderNumber,
  customer,
  delivery,
  deliveryTime,
  cart,
  totalAmount,
  privacyAgreement
}: BuildCheckoutOrderInput): CheckoutOrder {
  return {
    id: orderNumber,
    orderNumber,
    customer,
    delivery,
    deliveryTime,
    items: cart.map((item) => ({
      cartKey: item.cartKey,
      productId: item.id,
      name: item.name,
      sectionTitle: item.sectionTitle,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.price * item.quantity,
      selectedOptions: item.selectedOptions
    })),
    totalAmount,
    privacyAgreement,
    createdAt: new Date().toISOString()
  };
}
