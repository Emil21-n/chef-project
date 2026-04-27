import type { MenuSection, Product } from "@/shared/model/restaurant";

export type ProductWithSection = Product & {
  sectionTitle: string;
};

export type MenuSectionWithProducts = Omit<MenuSection, "products"> & {
  products: ProductWithSection[];
};
