import type { Channel, ReminderStatus } from "@/generated/prisma/client";
import { HttpError } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma";
import { sendTwilioReminder } from "@/server/integrations/twilio";

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

export async function sendReminderForOwnerMember(
  adminUserId: string,
  memberId: string,
  input: {
    reminderType: ReminderType;
    message?: string;
  },
) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, adminUserId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      whatsappEnabled: true,
      endDate: true,
      paymentStatus: true,
    },
  });
  if (!member) throw new HttpError(404, "Member not found.");
  if (input.reminderType === "PAYMENT_DUE" && member.paymentStatus === "DONE") {
    throw new HttpError(400, "Payment is already marked done for this member.");
  }

  const channel: Channel = member.whatsappEnabled ? "WHATSAPP" : "SMS";
  const toPhone = normalizePhone(member.phone);
  const message =
    typeof input.message === "string" && input.message.trim()
      ? input.message.trim()
      : defaultReminderMessage({
          fullName: member.fullName,
          reminderType: input.reminderType,
          endDate: member.endDate,
        });

  let status: ReminderStatus = "SENT";
  try {
    await sendTwilioReminder({
      toPhone,
      message,
      channel,
    });
  } catch {
    status = "FAILED";
  }

  const log = await prisma.reminderLog.create({
    data: {
      memberId: member.id,
      channel,
      status,
      message,
    },
    select: {
      id: true,
      channel: true,
      status: true,
      sentAt: true,
    },
  });

  if (status === "FAILED") {
    throw new HttpError(502, "Failed to send reminder via provider.");
  }

  return log;
}
