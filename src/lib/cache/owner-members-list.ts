import {
  OWNER_MEMBERS_LIST_TTL_SEC,
  ownerMembersListCacheKey,
} from "@/lib/cache-keys";
import { getRedis, isRedisConfigured } from "@/lib/redis";

export async function getCachedOwnerMembersListJson(
  adminUserId: string,
): Promise<string | null> {
  if (!isRedisConfigured()) return null;

  try {
    const redis = await getRedis();
    const raw = await redis.get(ownerMembersListCacheKey(adminUserId));
    return typeof raw === "string" ? raw : null;
  } catch (err) {
    console.error("[redis] getCachedOwnerMembersList", err);
    return null;
  }
}

export async function setCachedOwnerMembersListJson(
  adminUserId: string,
  json: string,
): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const redis = await getRedis();
    await redis.set(ownerMembersListCacheKey(adminUserId), json, {
      EX: OWNER_MEMBERS_LIST_TTL_SEC,
    });
  } catch (err) {
    console.error("[redis] setCachedOwnerMembersList", err);
  }
}

export async function invalidateOwnerMembersListCache(
  adminUserId: string,
): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const redis = await getRedis();
    await redis.del(ownerMembersListCacheKey(adminUserId));
  } catch (err) {
    console.error("[redis] invalidateOwnerMembersListCache", err);
  }
}
