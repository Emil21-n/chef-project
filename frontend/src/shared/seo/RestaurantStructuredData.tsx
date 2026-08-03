import { LOGO_URL } from "@/shared/constants/restaurant";
import type { RestaurantData } from "@/shared/model/restaurant";
import { JsonLd } from "@/shared/seo/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/shared/seo/site";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
].map((day) => `https://schema.org/${day}`);

function readHttpsUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function readGeo(mapUrl: string) {
  try {
    const coordinates = new URL(mapUrl).searchParams.get("ll")?.split(",");
    const longitude = Number(coordinates?.[0]);
    const latitude = Number(coordinates?.[1]);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      "@type": "GeoCoordinates",
      latitude,
      longitude
    };
  } catch {
    return null;
  }
}

function readOpeningHours(hours: string) {
  const times = hours.match(/\b\d{1,2}:\d{2}\b/g);

  if (!times || times.length < 2) return null;

  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: DAYS_OF_WEEK,
    opens: times[0],
    closes: times[1]
  };
}

function buildMenu(data: RestaurantData) {
  const menuId = `${SITE_URL}/#menu`;

  return {
    "@type": "Menu",
    "@id": menuId,
    url: menuId,
    name: "Каталог блюд",
    inLanguage: "ru-RU",
    hasMenuSection: data.menuSections.map((section) => ({
      "@type": "MenuSection",
      name: section.title,
      hasMenuItem: section.products.map((product) => {
        const image = readHttpsUrl(product.image || "");

        return {
          "@type": "MenuItem",
          name: product.name,
          ...(product.description ? { description: product.description } : {}),
          ...(image ? { image } : {}),
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "RUB",
            availability: product.isAvailable
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock"
          }
        };
      })
    }))
  };
}

export function RestaurantStructuredData({ data }: { data: RestaurantData }) {
  const restaurantId = `${SITE_URL}/#restaurant`;
  const websiteId = `${SITE_URL}/#website`;
  const menuId = `${SITE_URL}/#menu`;
  const images = data.heroSlides
    .map((slide) => readHttpsUrl(slide.image))
    .filter(Boolean)
    .slice(0, 5);
  const instagram = readHttpsUrl(data.contactInfo.instagram);
  const geo = readGeo(data.contactInfo.mapUrl);
  const openingHoursSpecification = readOpeningHours(data.contactInfo.hours);

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "ru-RU",
        publisher: { "@id": restaurantId }
      },
      {
        "@type": "Restaurant",
        "@id": restaurantId,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        logo: LOGO_URL,
        ...(images.length ? { image: images } : {}),
        telephone: data.contactInfo.phone.replace(/[^+\d]/g, ""),
        email: data.contactInfo.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: data.contactInfo.address,
          addressLocality: "Москва",
          addressCountry: "RU"
        },
        ...(geo ? { geo } : {}),
        ...(openingHoursSpecification ? { openingHoursSpecification } : {}),
        servesCuisine: "Турецкая кухня",
        currenciesAccepted: "RUB",
        areaServed: {
          "@type": "City",
          name: "Москва"
        },
        ...(instagram ? { sameAs: [instagram] } : {}),
        menu: menuId,
        hasMenu: { "@id": menuId }
      },
      buildMenu(data)
    ]
  };

  return <JsonLd data={graph} />;
}
