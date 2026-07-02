import { getRedis, isRedisConfigured } from "./redis";

const OWNER_CACHE_TTL_SEC = 5 * 60; // 5 minutes
const OWNER_CACHE_PREFIX = "auth:owner:";

export interface CachedOwner {
  subscriptionPlan: string;
  trialEndsAt: string | null;
  accountInvalid: boolean;
}

export async function getCachedOwner(
  ownerId: string,
): Promise<CachedOwner | null> {
  if (!isRedisConfigured()) return null;

  try {
    const redis = await getRedis();
    if (!redis?.isReady) return null;
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
  if (!isRedisConfigured()) return;

  try {
    const redis = await getRedis();
    if (!redis?.isReady) return;
    await redis.set(`${OWNER_CACHE_PREFIX}${ownerId}`, JSON.stringify(data), {
      EX: OWNER_CACHE_TTL_SEC,
    });
  } catch {
    // non-fatal — DB is the source of truth
  }
}

/** Call this when an owner is deleted/updated so the next request re-checks DB. */
export async function invalidateCachedOwner(ownerId: string): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const redis = await getRedis();
    if (!redis?.isReady) return;
    await redis.del(`${OWNER_CACHE_PREFIX}${ownerId}`);
  } catch {
    // non-fatal
  }
}

