export type ProductOption = {
  id: string;
  label: string;
};

export type ProductOptionGroup = {
  id: string;
  label: string;
  required: boolean;
  options: ProductOption[];
};

export type SelectedProductOption = {
  groupId: string;
  groupLabel: string;
  optionId: string;
  optionLabel: string;
};

export type Product = {
  id: string;
  name: string;
  weight: string;
  price: number;
  description: string;
  image?: string;
  isAvailable: boolean;
  optionGroups?: ProductOptionGroup[];
};

export type MenuSection = {
  id: string;
  title: string;
  products: Product[];
};

export type HeroSlide = {
  title: string;
  text: string;
  image: string;
};

export type ContactInfo = {
  phone: string;
  phoneHref: string;
  whatsapp: string;
  instagram: string;
  email: string;
  address: string;
  hours: string;
  deliveryHours: string;
  mapEmbed: string;
  mapUrl: string;
  requisites: string[];
};

export type RestaurantData = {
  menuSections: MenuSection[];
  heroSlides: HeroSlide[];
  contactInfo: ContactInfo;
  minOrder: number;
};
