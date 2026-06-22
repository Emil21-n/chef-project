import type { CartItem } from "@/features/cart/model/types";
import type { SelectedProductOption } from "@/shared/model/restaurant";

export type CheckoutCustomer = {
  name: string;
  phone: string;
};

export type CheckoutDeliveryMethod = "pickup" | "delivery";

export type CheckoutDelivery = {
  method: string;
  methodCode?: CheckoutDeliveryMethod;
  methodLabel?: string;
  street: string;
  house: string;
  entrance: string;
  apartment: string;
  floor: string;
  comment: string;
};

export type CheckoutOrderItem = {
  cartKey: string;
  productId: string;
  name: string;
  sectionTitle: string;
  quantity: number;
  price: number;
  totalPrice: number;
  selectedOptions: SelectedProductOption[];
};

export type CheckoutOrderStatus =
  | "created"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export type CheckoutPaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type CheckoutPayment = {
  provider: "none" | "yookassa";
  status: CheckoutPaymentStatus;
  redirectUrl: string | null;
  externalPaymentId?: string | null;
};

export type CheckoutOrder = {
  id: string;
  orderNumber?: string;
  strapiDocumentId?: string;
  customer: CheckoutCustomer;
  delivery: CheckoutDelivery;
  deliveryTime: string;
  items: CheckoutOrderItem[];
  totalAmount: number;
  currency?: string;
  status?: CheckoutOrderStatus;
  paymentStatus?: CheckoutPaymentStatus;
  payment?: CheckoutPayment;
  notification?: {
    email: "sent" | "failed";
  };
  privacyAgreement: boolean;
  createdAt: string;
};

export type BuildCheckoutOrderInput = {
  customer: CheckoutCustomer;
  delivery: CheckoutDelivery;
  deliveryTime: string;
  cart: CartItem[];
  totalAmount: number;
  privacyAgreement: boolean;
};
