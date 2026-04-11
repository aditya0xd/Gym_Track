import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { guardGymOwnerPlanFeature } from "@/lib/plan-features/guard";
import { HttpError } from "@/lib/http/errors";
import {
  sendReminderForOwnerMember,
  type ReminderType,
} from "@/server/gym-owner/reminder.service";

type RouteContext = { params: Promise<{ id: string }> };
function isReminderType(v: unknown): v is ReminderType {
  return v === "MEMBERSHIP_EXPIRY" || v === "PAYMENT_DUE";
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const denied = await guardGymOwnerPlanFeature(session, "MANUAL_MEMBER_REMINDERS");
  if (denied) return denied;

  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const reminderType = isReminderType(body.reminderType)
    ? body.reminderType
    : "MEMBERSHIP_EXPIRY";
  const messageRaw =
    typeof body.message === "string" && body.message.trim() ? body.message.trim() : undefined;

  try {
    const log = await sendReminderForOwnerMember(session!.user.id, id, {
      reminderType,
      message: messageRaw,
    });
    return NextResponse.json({
      reminder: {
        id: log.id,
        channel: log.channel,
        status: log.status,
        sentAt: log.sentAt.toISOString(),
        reminderType,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}
