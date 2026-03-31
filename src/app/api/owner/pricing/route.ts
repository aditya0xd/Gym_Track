import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { HttpError } from "@/lib/http/errors";
import {
  listDurationPricesForOwner,
  upsertDurationPricesForOwner,
} from "@/server/gym-owner/pricing.service";
import type { MemberBillingDuration } from "@/generated/prisma/client";

function isDuration(v: unknown): v is MemberBillingDuration {
  return MEMBER_BILLING_DURATION_OPTIONS.some((o) => o.value === v);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prices = await listDurationPricesForOwner(session.user.id);
  return NextResponse.json({ prices });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { prices?: unknown };
  if (!Array.isArray(body.prices)) {
    return NextResponse.json(
      { message: "Body must include prices: [{ duration, priceInr }, ...]." },
      { status: 400 },
    );
  }

  const parsed: { duration: MemberBillingDuration; priceInr: string }[] = [];
  for (const row of body.prices) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (!isDuration(r.duration)) continue;
    if (typeof r.priceInr !== "string" && typeof r.priceInr !== "number") continue;
    parsed.push({
      duration: r.duration,
      priceInr: String(r.priceInr),
    });
  }

  if (parsed.length !== MEMBER_BILLING_DURATION_OPTIONS.length) {
    return NextResponse.json(
      {
        message: "Submit all four durations (1, 3, 6, 12 months) with priceInr.",
      },
      { status: 400 },
    );
  }

  const seen = new Set(parsed.map((p) => p.duration));
  if (seen.size !== 4) {
    return NextResponse.json(
      { message: "Each duration must appear exactly once." },
      { status: 400 },
    );
  }

  try {
    await upsertDurationPricesForOwner(session.user.id, parsed);
    const prices = await listDurationPricesForOwner(session.user.id);
    return NextResponse.json({ prices });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}
