import type { ProductWithSection } from "@/entities/product/model/types";

export type CartItem = ProductWithSection & {
  quantity: number;
};

export type AddToastState = {
  product: ProductWithSection;
  quantity: number;
  id: number;
};
