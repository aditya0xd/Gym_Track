/**
 * Tenant scoping for gym-owner (AdminUser) data. Always combine with `adminUserId` from the session.
 * Prevents accidental cross-tenant reads when used consistently (BOLA mitigation at the data layer).
 */
export function memberScope(adminUserId: string) {
  return { adminUserId, deletedAt: null } as const;
}

export function ownerInvoiceScope(adminUserId: string) {
  return { adminUserId, deletedAt: null } as const;
}

export function ownerDurationPriceScope(adminUserId: string) {
  return { adminUserId, deletedAt: null } as const;
}

export function activeOwnerWhere(adminUserId: string) {
  return { id: adminUserId, deletedAt: null } as const;
}
