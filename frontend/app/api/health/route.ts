import { NextResponse } from "next/server";

import { fetchFromStrapi, unwrapCollection } from "@/shared/api/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const response = await fetchFromStrapi("/api/products?pagination[pageSize]=1");

    if (unwrapCollection(response).length < 1) {
      throw new Error("Strapi returned no products.");
    }

    return NextResponse.json({ status: "healthy", strapi: "ok" });
  } catch (error) {
    console.error(
      "Application health check failed",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { status: "unhealthy", strapi: "unavailable" },
      { status: 503 }
    );
  }
}
