import type { CartItem } from "@/features/cart/model/types";
import type { SelectedProductOption } from "@/shared/model/restaurant";

export type CheckoutCustomer = {
  name: string;
  phone: string;
};

export type CheckoutDelivery = {
  method: string;
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

export type CheckoutOrder = {
  id: string;
  customer: CheckoutCustomer;
  delivery: CheckoutDelivery;
  deliveryTime: string;
  items: CheckoutOrderItem[];
  totalAmount: number;
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
