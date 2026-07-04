import { NextResponse } from "next/server";

import { runScheduledExpiryRemindersOneDayBefore } from "@/server/gym-owner/reminder.service";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorizeCron(request: Request): boolean {
  const isVercelCron =
    process.env.VERCEL === "1" && request.headers.get("x-vercel-cron") === "1";
  if (isVercelCron) {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) {
    return true;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Daily job: notify members whose plan expires **tomorrow** (calendar day in EXPIRY_REMINDER_TIMEZONE).
 * Secured with Authorization: Bearer CRON_SECRET. Configure Vercel Cron or an external scheduler.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit the cron endpoint to max 1 per hour (3600 seconds)
  const rateLimitResult = await rateLimit("cron:member-expiry-reminders", { limit: 1, interval: 3600 });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests. Cron already ran recently." }, { status: 429 });
  }

  try {
    const summary = await runScheduledExpiryRemindersOneDayBefore();
    return NextResponse.json(summary);
  } catch (e) {
    console.error("member-expiry-reminders cron", e);
    return NextResponse.json(
      { error: "Cron run failed." },
      { status: 500 },
    );
  }
}
