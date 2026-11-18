/**
 * In-Memory Token Bucket Rate Limiter
 *
 * Provides per-key rate limiting using the token bucket algorithm.
 * Each key (e.g., an IP address or user ID) gets its own bucket
 * that refills tokens at a steady rate.
 *
 * Default limit is controlled by the SCAN_RATE_LIMIT environment variable
 * (defaults to 10 requests per minute).
 */

/** The result of a rate limit check. */
export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Number of tokens remaining in the bucket after this check. */
  remaining: number;
  /** Milliseconds until the next token is available (0 if allowed). */
  resetIn: number;
}

/** Internal state for a single token bucket. */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  limit: number;
}

/** Window duration in milliseconds (1 minute). */
const WINDOW_MS = 60_000;

/** Global store of token buckets, keyed by identifier. */
const buckets = new Map<string, TokenBucket>();

/**
 * Interval to clean up expired buckets (every 5 minutes).
 * Prevents memory leaks from abandoned keys.
 */
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const BUCKET_EXPIRY_MS = 10 * 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > BUCKET_EXPIRY_MS) {
        buckets.delete(key);
      }
    }
    if (buckets.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow the Node.js process to exit even if the timer is running
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Get the default rate limit from environment, falling back to 10.
 */
function getDefaultLimit(): number {
  const envLimit = process.env.SCAN_RATE_LIMIT;
  if (envLimit) {
    const parsed = parseInt(envLimit, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 10;
}

/**
 * Refill tokens in a bucket based on elapsed time.
 * Tokens are added at a rate of `limit` tokens per minute.
 */
function refillBucket(bucket: TokenBucket): void {
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  const refillRate = bucket.limit / WINDOW_MS; // tokens per ms
  const tokensToAdd = elapsed * refillRate;

  bucket.tokens = Math.min(bucket.limit, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

/**
 * Check and consume a rate limit token for the given key.
 *
 * @param key - Identifier for the rate limit bucket (e.g., IP address, user ID, "global")
 * @param limit - Maximum number of requests per minute. Defaults to SCAN_RATE_LIMIT env var or 10.
 * @returns A RateLimitResult indicating whether the request is allowed.
 *
 * @example
 * ```ts
 * const result = rateLimit('user:123');
 * if (!result.allowed) {
 *   return new Response('Too many requests', {
 *     status: 429,
 *     headers: { 'Retry-After': String(Math.ceil(result.resetIn / 1000)) },
 *   });
 * }
 * ```
 */
export function rateLimit(key: string, limit?: number): RateLimitResult {
  const maxTokens = limit ?? getDefaultLimit();

  ensureCleanupTimer();

  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = {
      tokens: maxTokens,
      lastRefill: Date.now(),
      limit: maxTokens,
    };
    buckets.set(key, bucket);
  }

  // Update limit if it changed
  bucket.limit = maxTokens;

  // Refill based on elapsed time
  refillBucket(bucket);

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetIn: 0,
    };
  }

  // Not enough tokens — calculate when the next one will be available
  const refillRate = maxTokens / WINDOW_MS;
  const msUntilNextToken = Math.ceil((1 - bucket.tokens) / refillRate);

  return {
    allowed: false,
    remaining: 0,
    resetIn: msUntilNextToken,
  };
}
