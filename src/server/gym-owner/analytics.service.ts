import { prisma } from "@/lib/prisma";
import { memberScope } from "@/lib/tenant/scope";

type TrendPoint = {
  monthKey: string;
  month: string;
  revenue: number;
  paidMembers: number;
  unpaidMembers: number;
  partialMembers: number;
};

export type RevenueForecastMonth = {
  monthKey: string;
  month: string;
  trendBased: number;
  renewalPipeline: number;
  combined: number;
};

export type OwnerAnalytics = {
  summary: {
    totalMembers: number;
    activeMembers: number;
    pausedMembers: number;
    inactiveMembers: number;
    paidMembers: number;
    unpaidMembers: number;
    partialMembers: number;
    monthlyRevenue: number;
  };
  retention: {
    renewalRate: number;
    churnRate: number;
  };
  payments: {
    successRate: number;
    partialRate: number;
    failureRate: number;
  };
  trends: TrendPoint[];
  revenueForecast: {
    nextMonthCombined: number;
    nextQuarterCombined: number;
    months: RevenueForecastMonth[];
    assumptions: string[];
  };
  insights: string[];
};

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleString("en-IN", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function monthStartFromNow(offset: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1),
  );
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function linearRegression(
  xs: number[],
  ys: number[],
): { slope: number; intercept: number } {
  const n = xs.length;
  if (n === 0 || n !== ys.length) {
    return { slope: 0, intercept: 0 };
  }
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return { slope, intercept };
}

function renewalPipelineForMonth(
  members: {
    id: string;
    endDate: Date;
    planPrice: unknown;
    membershipStatus: string;
  }[],
  effectiveEndDates: Map<string, Date>,
  effectivePlanPrices: Map<string, number>,
  monthStart: Date,
  nextMonthStart: Date,
  renewalProbability: number,
): number {
  return members
    .filter(
      (m) =>
        m.membershipStatus === "ACTIVE" &&
        effectiveEndDates.get(m.id)! >= monthStart &&
        effectiveEndDates.get(m.id)! < nextMonthStart,
    )
    .reduce(
      (s, m) => s + effectivePlanPrices.get(m.id)! * renewalProbability,
      0,
    );
}

export async function getOwnerAnalytics(
  adminUserId: string,
): Promise<OwnerAnalytics> {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const currentMonthStart = monthStartFromNow(0);
  const nextMonthStart = monthStartFromNow(1);

  // Summary stats using SQL aggregation
  const summary = await prisma.$queryRaw<
    Array<{
      total_members: bigint;
      active_members: bigint;
      paused_members: bigint;
      inactive_members: bigint;
      paid_members: bigint;
      unpaid_members: bigint;
      partial_members: bigint;
      monthly_revenue: bigint;
    }>
  >`
    SELECT
      COUNT(*) as total_members,
      SUM(CASE WHEN "endDate" >= ${today} AND "membershipStatus" = 'ACTIVE' THEN 1 ELSE 0 END) as active_members,
      SUM(CASE WHEN "membershipStatus" = 'PAUSED' THEN 1 ELSE 0 END) as paused_members,
      SUM(CASE WHEN "endDate" < ${today} THEN 1 ELSE 0 END) as inactive_members,
      SUM(CASE WHEN "paymentStatus" = 'DONE' THEN 1 ELSE 0 END) as paid_members,
      SUM(CASE WHEN "paymentStatus" = 'NOT_DONE' THEN 1 ELSE 0 END) as unpaid_members,
      SUM(CASE WHEN "paymentStatus" = 'PARTIAL' THEN 1 ELSE 0 END) as partial_members,
      COALESCE((
        SELECT SUM(r."amountPaid")
        FROM "MembershipRenewal" r
        JOIN "Member" rm ON rm."id" = r."memberId"
        WHERE rm."deletedAt" IS NULL
          AND rm."adminUserId" = ${adminUserId}
          AND r."paidAt" >= ${currentMonthStart}
          AND r."paidAt" < ${nextMonthStart}
      ), 0) as monthly_revenue
    FROM "Member"
    WHERE "deletedAt" IS NULL
      AND "adminUserId" = ${adminUserId}
  `;

  const summaryData = summary[0] || {
    total_members: BigInt(0),
    active_members: BigInt(0),
    paused_members: BigInt(0),
    inactive_members: BigInt(0),
    paid_members: BigInt(0),
    unpaid_members: BigInt(0),
    partial_members: BigInt(0),
    monthly_revenue: BigInt(0),
  };

  const totalMembers = Number(summaryData.total_members);
  const activeMembers = Number(summaryData.active_members);
  const pausedMembers = Number(summaryData.paused_members);
  const inactiveMembers = Number(summaryData.inactive_members);
  const paidMembers = Number(summaryData.paid_members);
  const unpaidMembers = Number(summaryData.unpaid_members);
  const partialMembers = Number(summaryData.partial_members);
  const monthlyRevenue = Number(summaryData.monthly_revenue);

  // Trends using SQL GROUP BY
  const trendMonths = Array.from({ length: 6 }, (_, i) =>
    monthStartFromNow(i - 5),
  );
  const trendStart = trendMonths[0]!;
  const trendEnd = monthStartFromNow(1);

  const revenueTrends = await prisma.$queryRaw<
    Array<{
      month_key: string;
      revenue: bigint;
    }>
  >`
    SELECT
      TO_CHAR(r."paidAt", 'YYYY-MM') as month_key,
      SUM(r."amountPaid") as revenue
    FROM "MembershipRenewal" r
    JOIN "Member" m ON m."id" = r."memberId"
    WHERE m."deletedAt" IS NULL
      AND m."adminUserId" = ${adminUserId}
      AND r."paidAt" >= ${trendStart}
      AND r."paidAt" < ${trendEnd}
    GROUP BY TO_CHAR(r."paidAt", 'YYYY-MM')
  `;

  const cohortTrends = await prisma.$queryRaw<
    Array<{
      month_key: string;
      count: bigint;
      unpaid_count: bigint;
      partial_count: bigint;
    }>
  >`
    SELECT
      TO_CHAR(r."periodStart", 'YYYY-MM') as month_key,
      SUM(CASE WHEN r."paymentStatus" = 'DONE' THEN 1 ELSE 0 END) as count,
      SUM(CASE WHEN r."paymentStatus" = 'NOT_DONE' THEN 1 ELSE 0 END) as unpaid_count,
      SUM(CASE WHEN r."paymentStatus" = 'PARTIAL' THEN 1 ELSE 0 END) as partial_count
    FROM "MembershipRenewal" r
    JOIN "Member" m ON m."id" = r."memberId"
    WHERE m."deletedAt" IS NULL
      AND m."adminUserId" = ${adminUserId}
      AND r."periodStart" >= ${trendStart}
      AND r."periodStart" < ${trendEnd}
    GROUP BY TO_CHAR(r."periodStart", 'YYYY-MM')
  `;

  const revenueMap = new Map(revenueTrends.map((t) => [t.month_key, t]));
  const cohortMap = new Map(cohortTrends.map((t) => [t.month_key, t]));

  const trends: TrendPoint[] = trendMonths.map((month) => {
    const key = monthKey(month);
    const revData = revenueMap.get(key);
    const cohortData = cohortMap.get(key);
    return {
      monthKey: key,
      month: monthLabel(month),
      revenue: revData ? Math.round(Number(revData.revenue) * 100) / 100 : 0,
      paidMembers: cohortData ? Number(cohortData.count) : 0,
      unpaidMembers: cohortData ? Number(cohortData.unpaid_count) : 0,
      partialMembers: cohortData ? Number(cohortData.partial_count) : 0,
    };
  });

  // Fetch members only for retention analysis and insights (still needed for complex logic)
  const members = await prisma.member.findMany({
    where: memberScope(adminUserId),
    select: {
      id: true,
      phone: true,
      startDate: true,
      endDate: true,
      planPrice: true,
      membershipStatus: true,
      updatedAt: true,
      renewals: {
        select: {
          id: true,
          periodStart: true,
          periodEnd: true,
          paidAt: true,
          paymentStatus: true,
          planPrice: true,
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  // Compute effective end dates and plan prices for all members (done once for DRY)
  const effectiveEndDates = new Map<string, Date>();
  const effectivePlanPrices = new Map<string, number>();

  for (const member of members) {
    const paidRenewals = member.renewals.filter(
      (r) => r.paidAt && r.paymentStatus === "DONE",
    );
    const latestRenewal =
      paidRenewals.length > 0
        ? paidRenewals.sort(
            (a, b) => b.periodStart.getTime() - a.periodStart.getTime(),
          )[0]
        : null;
    const effectiveEndDate = latestRenewal
      ? new Date(
          Math.max(member.endDate.getTime(), latestRenewal.periodEnd.getTime()),
        )
      : member.endDate;
    const effectivePlanPrice = latestRenewal
      ? Number(latestRenewal.planPrice)
      : Number(member.planPrice);

    effectiveEndDates.set(member.id, effectiveEndDate);
    effectivePlanPrices.set(member.id, effectivePlanPrice);
  }

  // Build timeline of membership periods for each phone number
  // This unifies inline renewals and legacy new-row renewals into one opportunity model
  const periodsByPhone = new Map<
    string,
    Array<{ start: Date; end: Date; isRenewal: boolean; status: string }>
  >();

  for (const member of members) {
    const key = member.phone.trim();
    const periods = periodsByPhone.get(key) ?? [];

    // Add the original member enrollment period (use member.endDate, not effective end date)
    periods.push({
      start: member.startDate,
      end: member.endDate,
      isRenewal: false,
      status: member.membershipStatus,
    });

    // Add all inline renewals as separate periods (only fully paid renewals)
    for (const renewal of member.renewals) {
      if (
        renewal.paidAt &&
        renewal.paymentStatus === "DONE" &&
        renewal.periodStart.getTime() !== member.startDate.getTime()
      ) {
        periods.push({
          start: renewal.periodStart,
          end: renewal.periodEnd,
          isRenewal: true,
          status: member.membershipStatus,
        });
      }
    }

    periodsByPhone.set(key, periods);
  }

  // Sort periods by start date for each phone number
  for (const periods of periodsByPhone.values()) {
    periods.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  let opportunities = 0;
  let renewed = 0;

  for (const periods of periodsByPhone.values()) {
    for (let i = 0; i < periods.length; i += 1) {
      const current = periods[i]!;
      const next = periods[i + 1];

      // Skip paused members - their clock is frozen, not a churn opportunity
      if (current.status === "PAUSED") {
        continue;
      }

      // A renewal opportunity exists when a period ends
      // (unless it's the current active period)
      if (current.end > today) {
        continue; // Still active, no churn opportunity yet
      }

      opportunities += 1;

      // Check if they renewed: look for a next period starting within 30 days
      if (next && next.start <= addDays(current.end, 30)) {
        renewed += 1;
      }
    }
  }
  const churned = Math.max(0, opportunities - renewed);

  const trendsSorted = [...trends].sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
  );
  const xs = trendsSorted.map((_, i) => i);
  const ys = trendsSorted.map((t) => t.revenue);
  const { slope, intercept } = linearRegression(xs, ys);

  const renewalProbability =
    opportunities > 0 ? Math.min(1, Math.max(0, renewed / opportunities)) : 0.5;

  const forecastMonths: RevenueForecastMonth[] = [];
  for (let k = 1; k <= 3; k += 1) {
    const ms = monthStartFromNow(k);
    const msNext = monthStartFromNow(k + 1);
    const xIndex = 5 + k;
    const trendBased = Math.max(0, intercept + slope * xIndex);
    const renewalPipeline =
      Math.round(
        renewalPipelineForMonth(
          members,
          effectiveEndDates,
          effectivePlanPrices,
          ms,
          msNext,
          renewalProbability,
        ) * 100,
      ) / 100;
    const combined =
      trendBased > 0 && renewalPipeline > 0
        ? Math.round(((trendBased + renewalPipeline) / 2) * 100) / 100
        : Math.round(Math.max(trendBased, renewalPipeline) * 100) / 100;
    forecastMonths.push({
      monthKey: monthKey(ms),
      month: monthLabel(ms),
      trendBased: Math.round(trendBased * 100) / 100,
      renewalPipeline,
      combined,
    });
  }

  const nextMonthCombined = forecastMonths[0]?.combined ?? 0;
  const nextQuarterCombined =
    Math.round(forecastMonths.reduce((s, m) => s + m.combined, 0) * 100) / 100;

  const assumptions: string[] = [
    opportunities > 0
      ? `Renewal probability uses your observed renewal rate (${pct(renewed, opportunities)}%).`
      : "No renewal history yet — renewal pipeline uses a 50% placeholder until more renewals are recorded.",
    "Trend line is a linear fit on the last 6 months of revenue from paid enrollments.",
    "Pipeline uses active members whose membership ends in each future month × renewal probability × current plan price.",
  ];

  const staleThreshold = addDays(today, -10);
  const staleActiveCount = members.filter(
    (m) =>
      effectiveEndDates.get(m.id)! >= today &&
      m.membershipStatus === "ACTIVE" &&
      m.updatedAt < staleThreshold,
  ).length;
  const expiringSoonCount = members.filter(
    (m) =>
      effectiveEndDates.get(m.id)! >= today &&
      effectiveEndDates.get(m.id)! <= addDays(today, 7) &&
      m.membershipStatus === "ACTIVE",
  ).length;

  const insights: string[] = [];
  if (staleActiveCount > 0) {
    insights.push(
      `${staleActiveCount} active members have no activity updates in 10+ days. Send reminder follow-ups.`,
    );
  }
  if (expiringSoonCount > 0) {
    insights.push(
      `${expiringSoonCount} memberships expire in the next 7 days. Trigger renewal reminders now.`,
    );
  }
  if (unpaidMembers > 0) {
    insights.push(
      `${unpaidMembers} members are marked unpaid. Follow up for payment confirmation.`,
    );
  }
  if (insights.length === 0) {
    insights.push(
      "Membership health looks stable. Continue weekly reminder and payment follow-up checks.",
    );
  }

  insights.push(
    `Forecast: ~${Math.round(nextQuarterCombined)} INR combined over the next 3 months (trend + renewal pipeline).`,
  );

  const successRate = pct(paidMembers, totalMembers);
  const partialRate = pct(partialMembers, totalMembers);
  const failureRate =
    totalMembers > 0 ? Math.max(0, 100 - successRate - partialRate) : 0;

  return {
    summary: {
      totalMembers,
      activeMembers,
      pausedMembers,
      inactiveMembers,
      paidMembers,
      unpaidMembers,
      partialMembers,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    },
    retention: {
      renewalRate: pct(renewed, opportunities),
      churnRate: pct(churned, opportunities),
    },
    payments: {
      successRate,
      partialRate,
      failureRate,
    },
    trends,
    revenueForecast: {
      nextMonthCombined,
      nextQuarterCombined,
      months: forecastMonths,
      assumptions,
    },
    insights,
  };
}
