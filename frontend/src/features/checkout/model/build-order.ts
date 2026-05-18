import type {
  BuildCheckoutOrderInput,
  CheckoutOrder
} from "@/features/checkout/model/types";

function createTemporaryOrderId() {
  const timestamp = Date.now().toString(36);
  const suffix = Math.random().toString(36).slice(2, 8);

  return `temp-${timestamp}-${suffix}`;
}

export function buildCheckoutOrder({
  customer,
  delivery,
  deliveryTime,
  cart,
  totalAmount,
  privacyAgreement
}: BuildCheckoutOrderInput): CheckoutOrder {
  return {
    id: createTemporaryOrderId(),
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
