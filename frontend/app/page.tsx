import { RestaurantPage } from "@/components/RestaurantPage";
import { getRestaurantData } from "@/shared/api/restaurant-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getRestaurantData();

  return <RestaurantPage data={data} />;
}
