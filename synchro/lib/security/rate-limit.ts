/**
 * Rate Limiting Abstraction
 * 
 * Note: For this demo/staging environment, we are using an in-memory Map.
 * For production, this should be swapped out with a Redis-backed store
 * (e.g., using @upstash/ratelimit or ioredis) to work across serverless edge functions.
 */

interface RateLimitStore {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitStore>();

interface RateLimitOptions {
  interval: number; // in milliseconds
  maxRequests: number;
}

export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { interval: 60000, maxRequests: 60 }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const now = Date.now();
  
  // Cleanup old records to prevent memory leak in development
  if (Math.random() < 0.05) {
    for (const [key, store] of memoryStore.entries()) {
      if (store.timestamps.length > 0 && now - store.timestamps[0] > options.interval) {
        store.timestamps = store.timestamps.filter(ts => now - ts < options.interval);
        if (store.timestamps.length === 0) {
          memoryStore.delete(key);
        }
      }
    }
  }

  const record = memoryStore.get(identifier) || { timestamps: [] };
  
  // Filter timestamps within the current interval
  const validTimestamps = record.timestamps.filter(ts => now - ts < options.interval);
  
  if (validTimestamps.length >= options.maxRequests) {
    const oldestTimestamp = validTimestamps[0];
    const reset = oldestTimestamp + options.interval;
    return {
      success: false,
      limit: options.maxRequests,
      remaining: 0,
      reset
    };
  }

  // Record this request
  validTimestamps.push(now);
  memoryStore.set(identifier, { timestamps: validTimestamps });

  return {
    success: true,
    limit: options.maxRequests,
    remaining: options.maxRequests - validTimestamps.length,
    reset: now + options.interval
  };
}
