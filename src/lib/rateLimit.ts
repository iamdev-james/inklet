const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const PRUNE_THRESHOLD = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
}

const store = globalThis as unknown as { __offprintRateBuckets?: Map<string, number[]> };

function buckets(): Map<string, number[]> {
  store.__offprintRateBuckets ??= new Map();
  return store.__offprintRateBuckets;
}

function pruneAll(now: number): void {
  for (const [key, hits] of buckets()) {
    const fresh = hits.filter((t) => now - t < WINDOW_MS);
    if (fresh.length === 0) {
      buckets().delete(key);
    } else {
      buckets().set(key, fresh);
    }
  }
}

export function checkRateLimit(ip: string, now = Date.now()): RateLimitResult {
  if (buckets().size > PRUNE_THRESHOLD) pruneAll(now);

  const hits = (buckets().get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    buckets().set(ip, hits);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((hits[0] + WINDOW_MS - now) / 1000)),
      remaining: 0,
    };
  }
  hits.push(now);
  buckets().set(ip, hits);
  return { allowed: true, retryAfterSec: 0, remaining: MAX_PER_WINDOW - hits.length };
}

export function resetRateLimits(): void {
  buckets().clear();
}
