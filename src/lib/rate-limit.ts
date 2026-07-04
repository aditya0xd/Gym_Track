import { getRedis } from "./redis";

interface RateLimitConfig {
  interval: number; // in seconds
  limit: number;
}

const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * A simple rate limiter that uses Redis if available, 
 * with a fallback to an in-memory Map for single-instance/dev usage.
 */
export async function rateLimit(identifier: string, config: RateLimitConfig) {
  const now = Date.now();
  let redisClient = null;
  
  try {
    redisClient = await getRedis();
  } catch (error) {
    console.error("[rate-limit] Failed to get Redis client:", error);
  }

  if (redisClient?.isReady) {
    const key = `rate-limit:${identifier}`;
    
    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, config.interval);
      }
      
      const remaining = Math.max(0, config.limit - current);
      
      return {
        success: current <= config.limit,
        limit: config.limit,
        remaining,
        reset: now + config.interval * 1000,
      };
    } catch (error) {
      console.error("[rate-limit] Redis error, falling back to memory:", error);
      // Fall through to memory store below
    }
  }

  // Fallback to in-memory store
  let record = memoryStore.get(identifier);
  
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + config.interval * 1000 };
  }
  
  record.count++;
  memoryStore.set(identifier, record);
  
  const remaining = Math.max(0, config.limit - record.count);
  
  return {
    success: record.count <= config.limit,
    limit: config.limit,
    remaining,
    reset: record.resetAt,
  };
}
