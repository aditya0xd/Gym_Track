import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";
import { HttpError } from "@/lib/http/errors";
import {
  changeOwnerPlan,
  getOwnerManagePlanData,
} from "@/server/gym-owner/manage-plan.service";
import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";

function isPlan(v: unknown): v is OwnerSubscriptionPlan {
  return OWNER_SUBSCRIPTION_PLAN_OPTIONS.some((o) => o.value === v);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getOwnerManagePlanData(session.user.id);
  return NextResponse.json({
    ...data,
    trialEndsAt: data.trialEndsAt?.toISOString() ?? null,
    invoices: data.invoices.map((row: (typeof data.invoices)[number]) => ({
      ...row,
      amountInr: row.amountInr.toString(),
      dueDate: row.dueDate.toISOString().slice(0, 10),
      paidAt: row.paidAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  if (!isPlan(body.subscriptionPlan)) {
    return NextResponse.json({ message: "Invalid subscriptionPlan." }, { status: 400 });
  }

  try {
    await changeOwnerPlan(session.user.id, body.subscriptionPlan);
    return NextResponse.json({ message: "Plan updated. Billing invoice created." });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}
