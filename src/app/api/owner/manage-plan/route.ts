import { NextResponse } from "next/server";
import { z } from "zod";

import { HttpError } from "@/lib/http/errors";
import { withGymOwner } from "@/lib/api-auth";
import { parseRequestBody, ownerSubscriptionPlanSchema } from "@/lib/validation";
import {
  changeOwnerPlan,
  getOwnerManagePlanData,
} from "@/server/gym-owner/manage-plan.service";

const changePlanSchema = z.object({
  subscriptionPlan: ownerSubscriptionPlanSchema,
});

async function GETHandler(_request: Request, userId: string) {
  const data = await getOwnerManagePlanData(userId);
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

async function PATCHHandler(request: Request, userId: string) {
  const { data, error } = await parseRequestBody(request, changePlanSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: 400 });
  }

  try {
    const result = await changeOwnerPlan(userId, data.subscriptionPlan);
    if (!result.changed) {
      return NextResponse.json({ message: "You are already on this plan." });
    }

    return NextResponse.json({ message: "Billing invoice created. Plan will be updated after payment." });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const GET = withGymOwner(GETHandler);
export const PATCH = withGymOwner(PATCHHandler);
