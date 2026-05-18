import type {
  ContactInfo,
  HeroSlide,
  MenuSection,
  Product,
  ProductOptionGroup,
  RestaurantData
} from "@/shared/model/restaurant";

type StrapiRecord = Record<string, unknown>;

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

function getStrapiApiUrl() {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL?.trim();

  if (!strapiUrl) {
    throw new Error("Missing NEXT_PUBLIC_STRAPI_API_URL environment variable.");
  }

  return strapiUrl.replace(/\/$/, "");
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
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) return parsedValue;
  }

  return fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

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

function describeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
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

async function fetchFromStrapi(path: string, strapiUrl: string) {
  const headers: HeadersInit = {
    Accept: "application/json"
  };
  const token = process.env.STRAPI_API_TOKEN?.trim();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${strapiUrl}${path}`, {
      headers,
      cache: "no-store"
    });
  } catch (error) {
    throw new Error(
      `Unable to reach Strapi at ${strapiUrl}${path}: ${describeError(error)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Strapi request failed: ${response.status} ${response.statusText} (${path})`
    );
  }

  return response.json();
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

      products.push(mapProduct(productRecord, strapiUrl));
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
    .map((slide) => mapHeroSlide(slide, strapiUrl))
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
