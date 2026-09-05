/**
 * Huzur Booking Platform — Route Handler Rate Limiter
 * 
 * Provides defense-in-depth against booking request spam, botting, and telephone abuse.
 * 
 * Architecture:
 * 1. Primary engine: Upstash Redis REST (when UPSTASH_REDIS_REST_URL and
 *    UPSTASH_REDIS_REST_TOKEN are present in environment variables).
 * 2. Fallback engine: Sliding-window in-memory rate limiter with automated
 *    timestamp pruning (for test environments, local dev, and self-hosted instances).
 */

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter: number; // Seconds until next slot opens
}

interface InMemoryRecord {
  timestamps: number[];
}

// In-memory sliding window cache
const memoryStore = new Map<string, InMemoryRecord>();

/**
 * Periodically purge stale records from in-memory cache to prevent memory leaks
 */
function cleanupMemoryStore(windowMs: number) {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Rate limit check function.
 * 
 * @param identifier - Unique client identifier (e.g. normalized phone number or IP)
 * @param limit - Maximum requests allowed within window (default: 5)
 * @param windowSeconds - Sliding window duration in seconds (default: 3600 = 1 hour)
 */
export async function rateLimit(
  identifier: string,
  limit = 5,
  windowSeconds = 3600
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  const resetTimestamp = Math.floor((now + windowMs) / 1000);

  // 1. Try Upstash Redis if configured
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const key = `ratelimit:booking:${identifier}`;
      // Execute Redis EVAL script or sliding window sorted set
      const response = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['ZREMRANGEBYSCORE', key, 0, now - windowMs],
          ['ZCARD', key],
          ['ZADD', key, now, `${now}-${Math.random()}`],
          ['EXPIRE', key, windowSeconds],
        ]),
        cache: 'no-store',
      });

      if (response.ok) {
        const results = await response.json();
        const currentCount = (results[1]?.result as number) || 0;

        if (currentCount >= limit) {
          return {
            success: false,
            limit,
            remaining: 0,
            reset: resetTimestamp,
            retryAfter: windowSeconds,
          };
        }

        return {
          success: true,
          limit,
          remaining: Math.max(0, limit - (currentCount + 1)),
          reset: resetTimestamp,
          retryAfter: 0,
        };
      }
    } catch (redisErr) {
      console.warn('[RateLimit] Upstash call failed, falling back to in-memory:', redisErr);
    }
  }

  // 2. Fallback to in-memory sliding window
  cleanupMemoryStore(windowMs);

  let record = memoryStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(identifier, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.floor((oldestTimestamp + windowMs) / 1000),
      retryAfter: Math.max(1, retryAfter),
    };
  }

  record.timestamps.push(now);

  return {
    success: true,
    limit,
    remaining: limit - record.timestamps.length,
    reset: resetTimestamp,
    retryAfter: 0,
  };
}

/**
 * Resets rate limit for a specific identifier (useful for unit tests and administrative bypass)
 */
export function resetRateLimit(identifier: string) {
  memoryStore.delete(identifier);
}
