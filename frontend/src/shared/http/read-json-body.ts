import "server-only";

export class JsonRequestBodyError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "JsonRequestBodyError";
    this.status = status;
  }
}

function isJsonContentType(value: string) {
  const mediaType = value.split(";", 1)[0]?.trim().toLowerCase();

  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

export async function readJsonBody<T = unknown>(request: Request, maxBytes: number): Promise<T> {
  if (!isJsonContentType(request.headers.get("content-type") || "")) {
    throw new JsonRequestBodyError("Ожидается JSON-запрос.", 415);
  }

  if (!request.body) {
    throw new JsonRequestBodyError("Пустое тело запроса.", 400);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new JsonRequestBodyError("Тело запроса слишком большое.", 413);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as T;
  } catch {
    throw new JsonRequestBodyError("Некорректный JSON.", 400);
  }
}
