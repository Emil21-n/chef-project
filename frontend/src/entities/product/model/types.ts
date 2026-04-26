import type { MenuSection, Product } from "@/data/menu";

export type ProductWithSection = Product & {
  sectionTitle: string;
};

export type MenuSectionWithProducts = Omit<MenuSection, "products"> & {
  products: ProductWithSection[];
};
