import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { HttpError } from "@/lib/http/errors";
import {
  pauseMembershipForOwner,
  resumeMembershipForOwner,
} from "@/server/gym-owner/member.service";

type RouteContext = { params: Promise<{ id: string }> };

function isAction(v: unknown): v is "pause" | "resume" {
  return v === "pause" || v === "resume";
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  if (!isAction(body.action)) {
    return NextResponse.json({ message: "action must be pause or resume." }, { status: 400 });
  }

  try {
    if (body.action === "pause") {
      const m = await pauseMembershipForOwner(session.user.id, id);
      return NextResponse.json({
        message: "Membership paused. Time frozen until you resume.",
        member: {
          id: m.id,
          membershipStatus: m.membershipStatus,
          pausedAt: m.pausedAt?.toISOString() ?? null,
          endDate: m.endDate.toISOString().slice(0, 10),
        },
      });
    }
    const m = await resumeMembershipForOwner(session.user.id, id);
    return NextResponse.json({
      message: "Membership resumed. End date extended by the pause duration.",
      member: {
        id: m.id,
        membershipStatus: m.membershipStatus,
        pausedAt: null,
        endDate: m.endDate.toISOString().slice(0, 10),
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}
