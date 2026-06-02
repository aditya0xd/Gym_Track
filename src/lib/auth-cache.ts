// lib/auth-cache.ts
import { createClient } from "redis";

const OWNER_CACHE_TTL_SEC = 5 * 60; // 5 minutes
const OWNER_CACHE_PREFIX = "auth:owner:";

// Reuse the same client your app already has, or create one here.
// If you already export a `redis` client from lib/redis.ts, import that instead.
let _client: ReturnType<typeof createClient> | null = null;

function getRedisClient() {
  if (!_client) {
    _client = createClient({
      url: process.env.REDIS_URL ?? "redis://localhost:6379",
    });
    _client.on("error", (err) =>
      console.error("[auth-cache] Redis error:", err),
    );
    _client
      .connect()
      .catch((err) => console.error("[auth-cache] Redis connect failed:", err));
  }
  return _client;
}

export interface CachedOwner {
  subscriptionPlan: string;
  trialEndsAt: string | null;
  accountInvalid: boolean;
}

export async function getCachedOwner(
  ownerId: string,
): Promise<CachedOwner | null> {
  try {
    const redis = getRedisClient();
    const raw = await redis.get(`${OWNER_CACHE_PREFIX}${ownerId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedOwner;
  } catch {
    return null; // cache miss on any error → fall through to DB
  }
}

export async function setCachedOwner(
  ownerId: string,
  data: CachedOwner,
): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.set(`${OWNER_CACHE_PREFIX}${ownerId}`, JSON.stringify(data), {
      EX: OWNER_CACHE_TTL_SEC,
    });
  } catch {
    // non-fatal — DB is the source of truth
  }
}

/** Call this when an owner is deleted/updated so the next request re-checks DB. */
export async function invalidateCachedOwner(ownerId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(`${OWNER_CACHE_PREFIX}${ownerId}`);
  } catch {
    // non-fatal
  }
}
