import type {
  Channel,
  ReminderCategory,
  ReminderStatus,
} from "@/generated/prisma/client";
import { HttpError } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma";
import { getMergedPlanFeatures } from "@/server/platform-plan-features.service";
import { memberScope } from "@/lib/tenant/scope";
import { sendAiSensyReminder } from "@/server/integrations/aisensy";

export type ReminderType = "MEMBERSHIP_EXPIRY" | "PAYMENT_DUE";

function normalizePhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  return `+91${cleaned}`;
}

function defaultReminderMessage(params: {
  fullName: string;
  reminderType: ReminderType;
  endDate: Date;
}) {
  const date = params.endDate.toISOString().slice(0, 10);
  if (params.reminderType === "MEMBERSHIP_EXPIRY") {
    return `Hi ${params.fullName}, your gym membership is expiring on ${date}. Please renew to continue uninterrupted access.`;
  }
  return `Hi ${params.fullName}, your membership payment is pending. Please complete payment to keep your plan active.`;
}

type MemberReminderRow = {
  id: string;
  fullName: string;
  phone: string;
  endDate: Date;
  whatsappEnabled: boolean;
};

async function deliverMemberReminder(params: {
  member: MemberReminderRow;
  message: string;
  reminderTypeTag: string;
  category: ReminderCategory;
  relatedEndDate: Date | null;
}) {
  const toPhone = normalizePhone(params.member.phone);
  let channel: Channel = "WHATSAPP";
  let status: ReminderStatus = "SENT";

  const send = (ch: Channel) =>
    sendAiSensyReminder({
      toPhone,
      message: params.message,
      userName: params.member.fullName,
      channel: ch,
      templateParams:
        ch === "WHATSAPP"
          ? [
              params.member.fullName,
              params.member.endDate.toISOString().slice(0, 10),
              params.message,
            ]
          : [params.member.fullName, params.message],
      tags: ["membership", params.reminderTypeTag.toLowerCase(), ch.toLowerCase()],
      attributes: {
        memberId: params.member.id,
        reminderType: params.reminderTypeTag,
      },
    });

  try {
    if (params.member.whatsappEnabled) {
      await send("WHATSAPP");
    } else {
      await send("SMS");
      channel = "SMS";
    }
  } catch {
    if (params.member.whatsappEnabled) {
      try {
        await send("SMS");
        channel = "SMS";
      } catch {
        status = "FAILED";
      }
    } else {
      status = "FAILED";
    }
  }

  return prisma.reminderLog.create({
    data: {
      memberId: params.member.id,
      channel,
      status,
      message: params.message,
      category: params.category,
      relatedEndDate: params.relatedEndDate,
    },
    select: {
      id: true,
      channel: true,
      status: true,
      sentAt: true,
    },
  });
}

export async function sendReminderForOwnerMember(
  adminUserId: string,
  memberId: string,
  input: {
    reminderType: ReminderType;
    message?: string;
  },
) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, ...memberScope(adminUserId) },
    select: {
      id: true,
      fullName: true,
      phone: true,
      endDate: true,
      paymentStatus: true,
      whatsappEnabled: true,
    },
  });
  if (!member) throw new HttpError(404, "Member not found.");
  if (input.reminderType === "PAYMENT_DUE" && member.paymentStatus === "DONE") {
    throw new HttpError(400, "Payment is already marked done for this member.");
  }

  const message =
    typeof input.message === "string" && input.message.trim()
      ? input.message.trim()
      : defaultReminderMessage({
          fullName: member.fullName,
          reminderType: input.reminderType,
          endDate: member.endDate,
        });

  const log = await deliverMemberReminder({
    member,
    message,
    reminderTypeTag: input.reminderType,
    category: "MANUAL",
    relatedEndDate: null,
  });

  if (log.status === "FAILED") {
    throw new HttpError(502, "Failed to send reminder via provider.");
  }

  return log;
}

function calendarTomorrowInTimeZone(timeZone: string): { y: number; m: number; d: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1));
  return {
    y: tomorrow.getUTCFullYear(),
    m: tomorrow.getUTCMonth() + 1,
    d: tomorrow.getUTCDate(),
  };
}

function utcMidnightDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/**
 * Finds members whose membership `endDate` is **tomorrow** in `EXPIRY_REMINDER_TIMEZONE` (default Asia/Kolkata)
 * and sends one WhatsApp/SMS reminder per member per end date (deduped via ReminderLog).
 */
export async function runScheduledExpiryRemindersOneDayBefore() {
  const tz = process.env.EXPIRY_REMINDER_TIMEZONE ?? "Asia/Kolkata";
  const { y, m, d } = calendarTomorrowInTimeZone(tz);
  const expiryDate = utcMidnightDate(y, m, d);

  const featureMatrix = await getMergedPlanFeatures();

  const rows = await prisma.member.findMany({
    where: {
      endDate: expiryDate,
      membershipStatus: "ACTIVE",
      deletedAt: null,
      adminUser: { deletedAt: null },
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      endDate: true,
      whatsappEnabled: true,
      adminUser: { select: { subscriptionPlan: true } },
    },
  });

  const members = rows.filter((r) => {
    const plan = r.adminUser.subscriptionPlan;
    return featureMatrix[plan].SCHEDULED_EXPIRY_REMINDERS;
  });

  let sent = 0;
  let skippedDeduped = 0;
  let failed = 0;

  for (const row of members) {
    const member = {
      id: row.id,
      fullName: row.fullName,
      phone: row.phone,
      endDate: row.endDate,
      whatsappEnabled: row.whatsappEnabled,
    };
    const existing = await prisma.reminderLog.findFirst({
      where: {
        memberId: member.id,
        category: "EXPIRY_ONE_DAY_BEFORE",
        relatedEndDate: member.endDate,
      },
    });
    if (existing) {
      skippedDeduped += 1;
      continue;
    }

    const dateStr = member.endDate.toISOString().slice(0, 10);
    const message = `Hi ${member.fullName}, your gym membership expires tomorrow (${dateStr}). Please renew to continue uninterrupted access.`;

    const log = await deliverMemberReminder({
      member,
      message,
      reminderTypeTag: "EXPIRY_ONE_DAY_BEFORE",
      category: "EXPIRY_ONE_DAY_BEFORE",
      relatedEndDate: member.endDate,
    });

    if (log.status === "FAILED") {
      failed += 1;
    } else {
      sent += 1;
    }
  }

  return {
    timezone: tz,
    expiryDateMatched: expiryDate.toISOString().slice(0, 10),
    candidatesEndDate: rows.length,
    skippedPlanFeature: rows.length - members.length,
    candidates: members.length,
    sent,
    skippedDeduped,
    failed,
  };
}
