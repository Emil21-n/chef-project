export type StrapiRecord = Record<string, unknown>;

export class StrapiRequestError extends Error {
  status: number;
  path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "StrapiRequestError";
    this.status = status;
    this.path = path;
  }
}

export function getStrapiApiUrl() {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL?.trim();

  if (!strapiUrl) {
    throw new Error("Missing NEXT_PUBLIC_STRAPI_API_URL environment variable.");
  }

  return strapiUrl.replace(/\/$/, "");
}

export function getStrapiPublicUrl() {
  const strapiPublicUrl =
    process.env.NEXT_PUBLIC_STRAPI_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_STRAPI_API_URL?.trim();

  if (!strapiPublicUrl) {
    throw new Error("Missing NEXT_PUBLIC_STRAPI_PUBLIC_URL environment variable.");
  }

  return strapiPublicUrl.replace(/\/$/, "");
}

export function unwrapRecord(value: unknown): StrapiRecord {
  if (!value || typeof value !== "object") return {};

  const record = value as StrapiRecord;
  const attributes = record.attributes;

  if (attributes && typeof attributes === "object") {
    return { id: record.id, ...(attributes as StrapiRecord) };
  }

  return record;
}

export function unwrapData(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const record = value as StrapiRecord;
  return "data" in record ? record.data : value;
}

export function unwrapCollection(value: unknown): StrapiRecord[] {
  const data = unwrapData(value);

  if (!Array.isArray(data)) return [];

  return data.map(unwrapRecord);
}

export function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) return parsedValue;
  }

  return fallback;
}

export function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function describeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function readStrapiError(response: Response) {
  try {
    const payload = await response.json();
    const error = unwrapRecord(payload?.error);
    const message = stringValue(error.message);

    if (message) return message;
  } catch {
    // The status text below is enough when Strapi does not return JSON.
  }

  return response.statusText;
}

export async function fetchFromStrapi(
  path: string,
  strapiUrl = getStrapiApiUrl(),
  init: RequestInit = {}
) {
  const headers = new Headers(init.headers);
  const token = process.env.STRAPI_API_TOKEN?.trim();

  headers.set("Accept", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${strapiUrl}${path}`, {
      ...init,
      headers,
      cache: init.cache ?? "no-store"
    });
  } catch (error) {
    throw new Error(
      `Unable to reach Strapi at ${strapiUrl}${path}: ${describeError(error)}`
    );
  }

  if (!response.ok) {
    const message = await readStrapiError(response);

    throw new StrapiRequestError(
      `Strapi request failed: ${response.status} ${message} (${path})`,
      response.status,
      path
    );
  }

  return response.json();
}
