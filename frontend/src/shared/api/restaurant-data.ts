import type {
  ContactInfo,
  HeroSlide,
  MenuSection,
  Product,
  RestaurantData
} from "@/shared/model/restaurant";

type StrapiRecord = Record<string, unknown>;

const DEFAULT_STRAPI_URL = "http://localhost:1337";

function getStrapiUrl() {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    DEFAULT_STRAPI_URL
  ).replace(/\/$/, "");
}

function unwrapRecord(value: unknown): StrapiRecord {
  if (!value || typeof value !== "object") return {};

  const record = value as StrapiRecord;
  const attributes = record.attributes;

  if (attributes && typeof attributes === "object") {
    return { id: record.id, ...(attributes as StrapiRecord) };
  }

  return record;
}

function unwrapData(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const record = value as StrapiRecord;
  return "data" in record ? record.data : value;
}

function unwrapCollection(value: unknown): StrapiRecord[] {
  const data = unwrapData(value);

  if (!Array.isArray(data)) return [];

  return data.map(unwrapRecord);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function fetchFromStrapi(path: string) {
  const headers: HeadersInit = {};

  if (process.env.STRAPI_API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.STRAPI_API_TOKEN}`;
  }

  const response = await fetch(`${getStrapiUrl()}${path}`, {
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Strapi request failed: ${response.status} ${response.statusText} (${path})`
    );
  }

  return response.json();
}

function mapProduct(record: StrapiRecord): Product {
  return {
    id: stringValue(record.externalId, stringValue(record.documentId, String(record.id))),
    name: stringValue(record.name),
    weight: stringValue(record.weight),
    price: numberValue(record.price),
    description: stringValue(record.description),
    image: stringValue(record.image) || undefined
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

function mapHeroSlide(record: StrapiRecord): HeroSlide {
  return {
    title: stringValue(record.title),
    text: stringValue(record.text),
    image: stringValue(record.image)
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

export async function getRestaurantData(): Promise<RestaurantData> {
  const menuParams = new URLSearchParams({
    "sort[0]": "sortOrder:asc",
    "pagination[pageSize]": "100"
  });
  const productParams = new URLSearchParams({
    "sort[0]": "sortOrder:asc",
    "pagination[pageSize]": "200",
    "populate[menuSection]": "true"
  });
  const heroParams = new URLSearchParams({
    "sort[0]": "sortOrder:asc",
    "pagination[pageSize]": "20"
  });

  const [
    sectionsResponse,
    productsResponse,
    heroResponse,
    contactResponse,
    settingsResponse
  ] =
    await Promise.all([
      fetchFromStrapi(`/api/menu-sections?${menuParams.toString()}`),
      fetchFromStrapi(`/api/products?${productParams.toString()}`),
      fetchFromStrapi(`/api/hero-slides?${heroParams.toString()}`),
      fetchFromStrapi("/api/contact-info"),
      fetchFromStrapi("/api/site-setting")
    ]);

  const productsBySection = unwrapCollection(productsResponse)
    .sort((a, b) => numberValue(a.sortOrder) - numberValue(b.sortOrder))
    .reduce<Map<string, Product[]>>((sections, productRecord) => {
      const sectionId = getProductSectionId(productRecord);
      const products = sections.get(sectionId) || [];

      products.push(mapProduct(productRecord));
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
    .map(mapHeroSlide)
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
