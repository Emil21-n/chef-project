import type { Metadata } from "next";

import { RestaurantPage } from "@/components/RestaurantPage";
import { getRestaurantData } from "@/shared/api/restaurant-data";
import { RestaurantStructuredData } from "@/shared/seo/RestaurantStructuredData";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/shared/seo/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "ru_RU",
    siteName: SITE_NAME,
    url: SITE_URL
  }
};

export default async function Home() {
  const data = await getRestaurantData();

  return (
    <>
      <RestaurantStructuredData data={data} />
      <RestaurantPage data={data} />
    </>
  );
}
