import { NextResponse } from "next/server";
import { z } from "zod";

import { HttpError } from "@/lib/http/errors";
import { withGymOwner } from "@/lib/api-auth";
import { parseRequestBody } from "@/lib/validation";
import {
  pauseMembershipForOwner,
  resumeMembershipForOwner,
} from "@/server/gym-owner/member.service";

const membershipStatusSchema = z.object({
  action: z.enum(["pause", "resume"]),
});

async function POSTHandler(request: Request, userId: string, context?: unknown) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const { data, error } = await parseRequestBody(request, membershipStatusSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: 400 });
  }

  try {
    if (data.action === "pause") {
      const m = await pauseMembershipForOwner(userId, id);
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
    const m = await resumeMembershipForOwner(userId, id);
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

export const POST = withGymOwner(POSTHandler);
