import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { guardGymOwnerPlanFeature } from "@/lib/plan-features/guard";
import type { PlanFeatureKey } from "@/generated/prisma/client";

export type ApiHandler<T = unknown> = (
  request: Request,
  context?: unknown,
) => Promise<T>;

export type AuthenticatedHandler<T = unknown> = (
  request: Request,
  userId: string,
  context?: unknown,
) => Promise<T>;

export type FeatureGatedHandler<T = unknown> = (
  request: Request,
  userId: string,
  context?: unknown,
) => Promise<T>;

/**
 * Wraps a handler to require gym_owner authentication.
 * Passes userId to the handler.
 */
export function withGymOwner<T extends NextResponse | Response>(
  handler: AuthenticatedHandler<T>,
): ApiHandler<T> {
  return async (request, context) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "gym_owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as T;
    }

    return handler(request, session.user.id, context);
  };
}

/**
 * Wraps a handler to require superadmin authentication.
 * Passes userId to the handler.
 */
export function withSuperAdmin<T extends NextResponse | Response>(
  handler: AuthenticatedHandler<T>,
): ApiHandler<T> {
  return async (request, context) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as T;
    }

    return handler(request, session.user.id, context);
  };
}

/**
 * Wraps a handler to require gym_owner authentication AND a specific plan feature.
 * Passes userId to the handler.
 */
export function withGymOwnerFeature<T extends NextResponse | Response>(
  feature: PlanFeatureKey,
  handler: AuthenticatedHandler<T>,
): ApiHandler<T> {
  return async (request, context) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "gym_owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as T;
    }

    const denied = await guardGymOwnerPlanFeature(session, feature);
    if (denied) return denied as T;

    return handler(request, session.user.id, context);
  };
}
