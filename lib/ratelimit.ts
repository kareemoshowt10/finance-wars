import { NextRequest, NextResponse } from "next/server";

type Bucket = { tokens: number; resetAt: number };
const buckets = new Map<string, Bucket>();

let lastCleanup = 0;
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
}

export function getClientIp(req: NextRequest | Request): string {
  const h = (req as Request).headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  /** If a bearer token is present, use this higher limit. */
  bearerLimit?: number;
};

export function rateLimit(
  req: NextRequest | Request,
  opts: RateLimitOptions
): NextResponse | null {
  cleanup();
  const ip = getClientIp(req);
  const auth = (req as Request).headers.get("authorization");
  const usingBearer = !!(auth && auth.toLowerCase().startsWith("bearer "));
  const effectiveLimit = usingBearer && opts.bearerLimit ? opts.bearerLimit : opts.limit;
  const idKey = usingBearer ? auth!.slice(7, 27) : ip;
  const fullKey = `${idKey}:${opts.key}`;
  const now = Date.now();
  let bucket = buckets.get(fullKey);
  if (!bucket || bucket.resetAt < now) {
    bucket = { tokens: effectiveLimit, resetAt: now + opts.windowMs };
    buckets.set(fullKey, bucket);
  }
  if (bucket.tokens <= 0) {
    const retry = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }
  bucket.tokens -= 1;
  return null;
}

export const DEFAULT_MUTATION = { limit: 60, bearerLimit: 300, windowMs: 60_000 };
