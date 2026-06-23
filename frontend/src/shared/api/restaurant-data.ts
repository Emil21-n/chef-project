import type {
  ContactInfo,
  HeroSlide,
  MenuSection,
  Product,
  ProductOptionGroup,
  RestaurantData
} from "@/shared/model/restaurant";
import {
  booleanValue,
  describeError,
  fetchFromStrapi,
  getStrapiApiUrl,
  getStrapiPublicUrl,
  numberValue,
  stringValue,
  type StrapiRecord,
  unwrapCollection,
  unwrapData,
  unwrapRecord
} from "@/shared/api/strapi";

const EMPTY_CONTACT_INFO: ContactInfo = {
  phone: "",
  phoneHref: "",
  whatsapp: "",
  instagram: "",
  email: "",
  address: "",
  hours: "",
  deliveryHours: "",
  mapEmbed: "about:blank",
  mapUrl: "",
  requisites: []
};

const EMPTY_RESTAURANT_DATA: RestaurantData = {
  menuSections: [],
  heroSlides: [],
  contactInfo: EMPTY_CONTACT_INFO,
  minOrder: 0
};

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function productOptionGroupsValue(value: unknown): ProductOptionGroup[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const optionGroups = value.flatMap((group): ProductOptionGroup[] => {
    if (!group || typeof group !== "object") return [];

    const groupRecord = group as StrapiRecord;
    const options = Array.isArray(groupRecord.options)
      ? groupRecord.options.flatMap((option): ProductOptionGroup["options"] => {
          if (!option || typeof option !== "object") return [];

          const optionRecord = option as StrapiRecord;
          const id = stringValue(optionRecord.id);
          const label = stringValue(optionRecord.label);

          return id && label ? [{ id, label }] : [];
        })
      : [];
    const id = stringValue(groupRecord.id);
    const label = stringValue(groupRecord.label);

    if (!id || !label || !options.length) return [];

    return [
      {
        id,
        label,
        required: booleanValue(groupRecord.required),
        options
      }
    ];
  });

  return optionGroups.length ? optionGroups : undefined;
}

function resolveStrapiUrl(value: string, strapiUrl: string) {
  if (!value) return "";

  try {
    return new URL(value, `${strapiUrl}/`).toString();
  } catch {
    return value;
  }
}

function readMediaUrl(value: unknown, strapiUrl: string): string {
  if (typeof value === "string") {
    return resolveStrapiUrl(value, strapiUrl);
  }

  if (Array.isArray(value)) {
    return readMediaUrl(value[0], strapiUrl);
  }

  const data = unwrapData(value);

  if (Array.isArray(data)) {
    return readMediaUrl(data[0], strapiUrl);
  }

  const record = unwrapRecord(data);
  const directUrl = stringValue(record.url);

  if (directUrl) {
    return resolveStrapiUrl(directUrl, strapiUrl);
  }

  const formats = record.formats;

  if (formats && typeof formats === "object") {
    const formatRecord = formats as StrapiRecord;
    const preferredFormat =
      formatRecord.large ||
      formatRecord.medium ||
      formatRecord.small ||
      formatRecord.thumbnail;
    const preferredUrl = stringValue(unwrapRecord(preferredFormat).url);

    if (preferredUrl) {
      return resolveStrapiUrl(preferredUrl, strapiUrl);
    }
  }

  return "";
}

function mapProduct(record: StrapiRecord, strapiUrl: string): Product {
  return {
    id: stringValue(record.externalId, stringValue(record.documentId, String(record.id))),
    name: stringValue(record.name),
    weight: stringValue(record.weight),
    price: numberValue(record.price),
    description: stringValue(record.description),
    image: readMediaUrl(record.image, strapiUrl) || undefined,
    isAvailable: booleanValue(record.isAvailable, true),
    optionGroups: productOptionGroupsValue(record.optionGroups)
  };
}

function mapMenuSection(record: StrapiRecord, products: Product[]): MenuSection {
  return {
    id: stringValue(record.slug, stringValue(record.documentId, String(record.id))),
    title: stringValue(record.title),
    products
  };
}

function getProductSectionId(record: StrapiRecord) {
  const section = unwrapRecord(unwrapData(record.menuSection));

  return stringValue(section.slug, stringValue(section.documentId, String(section.id || "")));
}

function mapHeroSlide(record: StrapiRecord, strapiUrl: string): HeroSlide {
  return {
    title: stringValue(record.title),
    text: stringValue(record.text),
    image: readMediaUrl(record.image, strapiUrl)
  };
}

function mapContactInfo(record: StrapiRecord): ContactInfo {
  return {
    phone: stringValue(record.phone),
    phoneHref: stringValue(record.phoneHref),
    whatsapp: stringValue(record.whatsapp),
    instagram: stringValue(record.instagram),
    email: stringValue(record.email),
    address: stringValue(record.address),
    hours: stringValue(record.hours),
    deliveryHours: stringValue(record.deliveryHours),
    mapEmbed: stringValue(record.mapEmbed),
    mapUrl: stringValue(record.mapUrl),
    requisites: stringArrayValue(record.requisites)
  };
}

async function getRestaurantDataFromStrapi(): Promise<RestaurantData> {
  const strapiUrl = getStrapiApiUrl();
  const strapiPublicUrl = getStrapiPublicUrl();
  const menuParams = new URLSearchParams({
    "sort[0]": "sortOrder:asc",
    "pagination[pageSize]": "100"
  });
  const productParams = new URLSearchParams({
    "sort[0]": "sortOrder:asc",
    "pagination[pageSize]": "200",
    populate: "*"
  });
  const heroParams = new URLSearchParams({
    "sort[0]": "sortOrder:asc",
    "pagination[pageSize]": "20",
    populate: "*"
  });

  const [
    sectionsResponse,
    productsResponse,
    heroResponse,
    contactResponse,
    settingsResponse
  ] =
    await Promise.all([
      fetchFromStrapi(`/api/menu-sections?${menuParams.toString()}`, strapiUrl),
      fetchFromStrapi(`/api/products?${productParams.toString()}`, strapiUrl),
      fetchFromStrapi(`/api/hero-slides?${heroParams.toString()}`, strapiUrl),
      fetchFromStrapi("/api/contact-info", strapiUrl),
      fetchFromStrapi("/api/site-setting", strapiUrl)
    ]);

  const productsBySection = unwrapCollection(productsResponse)
    .sort((a, b) => numberValue(a.sortOrder) - numberValue(b.sortOrder))
    .reduce<Map<string, Product[]>>((sections, productRecord) => {
      const sectionId = getProductSectionId(productRecord);
      const products = sections.get(sectionId) || [];

      products.push(mapProduct(productRecord, strapiPublicUrl));
      sections.set(sectionId, products);

      return sections;
    }, new Map());

  const menuSections = unwrapCollection(sectionsResponse)
    .map((section) => {
      const sectionId = stringValue(
        section.slug,
        stringValue(section.documentId, String(section.id))
      );

      return mapMenuSection(section, productsBySection.get(sectionId) || []);
    })
    .filter((section) => section.title && section.products.length);
  const heroSlides = unwrapCollection(heroResponse)
    .map((slide) => mapHeroSlide(slide, strapiPublicUrl))
    .filter((slide) => slide.title && slide.image);
  const contactInfo = mapContactInfo(unwrapRecord(unwrapData(contactResponse)));
  const siteSetting = unwrapRecord(unwrapData(settingsResponse));
  const minOrder = numberValue(siteSetting.minOrder, 4000);

  if (!menuSections.length) {
    throw new Error("Strapi did not return menu sections with products.");
  }

  if (!heroSlides.length) {
    throw new Error("Strapi did not return hero slides.");
  }

  if (!contactInfo.phone || !contactInfo.whatsapp) {
    throw new Error("Strapi did not return contact info.");
  }

  return {
    menuSections,
    heroSlides,
    contactInfo,
    minOrder
  };
}

export async function getRestaurantData(): Promise<RestaurantData> {
  try {
    return await getRestaurantDataFromStrapi();
  } catch (error) {
    console.error(`Unable to load Strapi restaurant data: ${describeError(error)}`);
    return EMPTY_RESTAURANT_DATA;
  }
}
