import { BusyError, getRenderLimiter } from "@/lib/concurrency";
import {
  ConversionError,
  ERROR_COPY,
  ERROR_HTTP_STATUS,
  toConversionError,
  type ConversionErrorCode,
} from "@/lib/errors";
import { assertPublicUrl } from "@/lib/fetcher/guard";
import { convertUrl, suggestFilename } from "@/lib/pipeline";
import { checkRateLimit } from "@/lib/rateLimit";
import { convertRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUSY_RETRY_AFTER_SEC = 20;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function errorResponse(
  code: ConversionErrorCode,
  requestId: string,
  retryAfterSec?: number,
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "x-request-id": requestId,
  });
  if (retryAfterSec) headers.set("retry-after", String(retryAfterSec));
  return new Response(
    JSON.stringify({ error: { code, ...ERROR_COPY[code] }, requestId }),
    { status: ERROR_HTTP_STATUS[code], headers },
  );
}

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse("INVALID_URL", requestId);
  }
  const parsed = convertRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("INVALID_URL", requestId);
  }
  const { url, format } = parsed.data;

  const rate = checkRateLimit(clientIp(request));
  if (!rate.allowed) {
    return errorResponse("RATE_LIMITED", requestId, rate.retryAfterSec);
  }

  try {
    await assertPublicUrl(url);

    const { buffer, doc, converter } = await getRenderLimiter().run(() => convertUrl(url, format));

    const filename = suggestFilename(doc.title, converter.extension);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": converter.contentType,
        "content-length": String(buffer.byteLength),
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
    });
  } catch (err) {
    if (err instanceof BusyError) {
      console.error(`[convert:${requestId}] busy: ${err.message}`);
      return errorResponse("RATE_LIMITED", requestId, BUSY_RETRY_AFTER_SEC);
    }
    const conversionError = toConversionError(err);
    console.error(`[convert:${requestId}] ${conversionError.code}: ${conversionError.message}`);
    if (!(err instanceof ConversionError)) {
      console.error(`[convert:${requestId}] cause:`, err);
    }
    return errorResponse(conversionError.code, requestId);
  }
}
