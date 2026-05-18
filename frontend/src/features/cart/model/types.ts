import type { ProductWithSection } from "@/entities/product/model/types";
import type { SelectedProductOption } from "@/shared/model/restaurant";

export type CartItem = ProductWithSection & {
  cartKey: string;
  quantity: number;
  selectedOptions: SelectedProductOption[];
};

export type AddToastState = {
  product: ProductWithSection;
  quantity: number;
  selectedOptions: SelectedProductOption[];
  cartKey: string;
  id: number;
};
