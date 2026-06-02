/** Redis key for `listMembersForOwner` (per gym owner). */
export function ownerMembersListCacheKey(adminUserId: string): string {
  return `owner:${adminUserId}:members`;
}

/** Default TTL for owner member list cache (seconds). */
export const OWNER_MEMBERS_LIST_TTL_SEC = 60;
