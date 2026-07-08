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
  return date.toLocaleString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function monthStartFromNow(offset: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
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

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
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
    endDate: Date;
    planPrice: unknown;
    membershipStatus: string;
  }[],
  monthStart: Date,
  nextMonthStart: Date,
  renewalProbability: number,
): number {
  return members
    .filter(
      (m) =>
        m.membershipStatus === "ACTIVE" &&
        m.endDate >= monthStart &&
        m.endDate < nextMonthStart,
    )
    .reduce((s, m) => s + Number(m.planPrice) * renewalProbability, 0);
}

export async function getOwnerAnalytics(adminUserId: string): Promise<OwnerAnalytics> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const currentMonthStart = monthStartFromNow(0);
  const nextMonthStart = monthStartFromNow(1);

  // Summary stats using SQL aggregation
  const summary = await prisma.$queryRaw<Array<{
    total_members: bigint;
    active_members: bigint;
    paused_members: bigint;
    inactive_members: bigint;
    paid_members: bigint;
    unpaid_members: bigint;
    partial_members: bigint;
    monthly_revenue: bigint;
  }>>`
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
  const trendMonths = Array.from({ length: 6 }, (_, i) => monthStartFromNow(i - 5));
  const trendStart = trendMonths[0]!;
  const trendEnd = monthStartFromNow(1);
  
  const revenueTrends = await prisma.$queryRaw<Array<{
    month_key: string;
    revenue: bigint;
  }>>`
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

  const cohortTrends = await prisma.$queryRaw<Array<{
    month_key: string;
    count: bigint;
    unpaid_count: bigint;
    partial_count: bigint;
  }>>`
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

  const revenueMap = new Map(revenueTrends.map(t => [t.month_key, t]));
  const cohortMap = new Map(cohortTrends.map(t => [t.month_key, t]));
  
  const trends: TrendPoint[] = trendMonths.map(month => {
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
      phone: true,
      startDate: true,
      endDate: true,
      planPrice: true,
      membershipStatus: true,
      updatedAt: true,
      renewals: { select: { id: true, periodStart: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const byPhone = new Map<string, typeof members>();
  for (const member of members) {
    const key = member.phone.trim();
    const arr = byPhone.get(key) ?? [];
    arr.push(member);
    byPhone.set(key, arr);
  }

  let opportunities = 0;
  let renewed = 0;
  for (const memberships of byPhone.values()) {
    const sorted = [...memberships].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    for (let i = 0; i < sorted.length; i += 1) {
      const curr = sorted[i]!;
      const next = sorted[i + 1];

      // 1) Inline renewals via MembershipRenewal
      let inlineRenewals = 0;
      for (const renewal of curr.renewals) {
        if (renewal.periodStart.getTime() !== curr.startDate.getTime()) {
          inlineRenewals += 1;
        }
      }
      opportunities += inlineRenewals;
      renewed += inlineRenewals;

      // 2) Check if the final period of this Member row has ended
      if (curr.endDate > today) {
        continue; // Active, no churn opportunity yet
      }

      opportunities += 1;

      // 3) Did they renew by creating a NEW Member row (old method)?
      if (next && next.startDate <= addDays(curr.endDate, 30)) {
        renewed += 1;
      }
    }
  }
  const churned = Math.max(0, opportunities - renewed);

  const trendsSorted = [...trends].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
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
        renewalPipelineForMonth(members, ms, msNext, renewalProbability) * 100,
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
      m.endDate >= today &&
      m.membershipStatus === "ACTIVE" &&
      m.updatedAt < staleThreshold,
  ).length;
  const expiringSoonCount = members.filter(
    (m) =>
      m.endDate >= today &&
      m.endDate <= addDays(today, 7) &&
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
    insights.push(`${unpaidMembers} members are marked unpaid. Follow up for payment confirmation.`);
  }
  if (insights.length === 0) {
    insights.push("Membership health looks stable. Continue weekly reminder and payment follow-up checks.");
  }

  insights.push(
    `Forecast: ~${Math.round(nextQuarterCombined)} INR combined over the next 3 months (trend + renewal pipeline).`,
  );

  const successRate = pct(paidMembers, totalMembers);
  const partialRate = pct(partialMembers, totalMembers);
  const failureRate = totalMembers > 0 ? Math.max(0, 100 - successRate - partialRate) : 0;

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
