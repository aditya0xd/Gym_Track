import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";
import { HttpError } from "@/lib/http/errors";
import { invalidateCachedOwner } from "@/lib/auth-cache";
import { updateGymOwnerSubscription } from "@/server/superadmin/gym-owner.service";
import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";

function isPlan(v: unknown): v is OwnerSubscriptionPlan {
  return OWNER_SUBSCRIPTION_PLAN_OPTIONS.some((o) => o.value === v);
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;

  const patch: {
    subscriptionPlan?: OwnerSubscriptionPlan;
    trialEndsAt?: Date | null;
  } = {};

  if (body.subscriptionPlan !== undefined) {
    if (body.subscriptionPlan === null || body.subscriptionPlan === "") {
      return NextResponse.json(
        { message: "subscriptionPlan cannot be empty." },
        { status: 400 },
      );
    }
    if (!isPlan(body.subscriptionPlan)) {
      return NextResponse.json(
        { message: "Invalid subscriptionPlan." },
        { status: 400 },
      );
    }
    patch.subscriptionPlan = body.subscriptionPlan;
  }

  if (body.trialEndsAt !== undefined) {
    if (body.trialEndsAt === null || body.trialEndsAt === "") {
      patch.trialEndsAt = null;
    } else if (typeof body.trialEndsAt === "string") {
      const d = new Date(body.trialEndsAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { message: "trialEndsAt must be a valid ISO date string." },
          { status: 400 },
        );
      }
      patch.trialEndsAt = d;
    } else {
      return NextResponse.json(
        { message: "trialEndsAt must be a string or null." },
        { status: 400 },
      );
    }
  }

  if (patch.subscriptionPlan === undefined && patch.trialEndsAt === undefined) {
    return NextResponse.json(
      { message: "Provide subscriptionPlan and/or trialEndsAt." },
      { status: 400 },
    );
  }

  try {
    const updated = await updateGymOwnerSubscription(id, patch);
    
    // Invalidate cache so next JWT callback fetches fresh data
    await invalidateCachedOwner(id);
    
    return NextResponse.json({
      gymOwner: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        subscriptionPlan: updated.subscriptionPlan,
        trialEndsAt: updated.trialEndsAt?.toISOString() ?? null,
        memberCount: updated._count.members,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}
