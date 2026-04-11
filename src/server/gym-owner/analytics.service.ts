import { prisma } from "@/lib/prisma";
import { memberScope } from "@/lib/tenant/scope";

type TrendPoint = {
  monthKey: string;
  month: string;
  revenue: number;
  paidMembers: number;
  unpaidMembers: number;
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
    monthlyRevenue: number;
  };
  retention: {
    renewalRate: number;
    churnRate: number;
  };
  payments: {
    successRate: number;
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
  const members = await prisma.member.findMany({
    where: memberScope(adminUserId),
    select: {
      id: true,
      phone: true,
      startDate: true,
      endDate: true,
      planPrice: true,
      paymentStatus: true,
      membershipStatus: true,
      updatedAt: true,
    },
    orderBy: { startDate: "asc" },
  });

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const currentMonthStart = monthStartFromNow(0);
  const nextMonthStart = monthStartFromNow(1);

  const activeMembers = members.filter(
    (m) => m.endDate >= today && m.membershipStatus === "ACTIVE",
  ).length;
  const pausedMembers = members.filter((m) => m.membershipStatus === "PAUSED").length;
  const inactiveMembers = members.filter((m) => m.endDate < today).length;
  const paidMembers = members.filter((m) => m.paymentStatus === "DONE").length;
  const unpaidMembers = members.length - paidMembers;

  const monthlyRevenue = members
    .filter(
      (m) =>
        m.paymentStatus === "DONE" &&
        m.startDate >= currentMonthStart &&
        m.startDate < nextMonthStart,
    )
    .reduce((sum, m) => sum + Number(m.planPrice), 0);

  const trendMonths = Array.from({ length: 6 }, (_, i) => monthStartFromNow(i - 5));
  const trendByKey = new Map<string, TrendPoint>();
  for (const month of trendMonths) {
    trendByKey.set(monthKey(month), {
      monthKey: monthKey(month),
      month: monthLabel(month),
      revenue: 0,
      paidMembers: 0,
      unpaidMembers: 0,
    });
  }

  for (const m of members) {
    const key = monthKey(m.startDate);
    const trend = trendByKey.get(key);
    if (!trend) continue;
    if (m.paymentStatus === "DONE") {
      trend.paidMembers += 1;
      trend.revenue += Number(m.planPrice);
    } else {
      trend.unpaidMembers += 1;
    }
  }

  const trends = Array.from(trendByKey.values()).map((t) => ({
    ...t,
    revenue: Math.round(t.revenue * 100) / 100,
  }));

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
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.endDate > today) continue;
      opportunities += 1;
      if (curr.startDate <= addDays(prev.endDate, 30)) {
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

  return {
    summary: {
      totalMembers: members.length,
      activeMembers,
      pausedMembers,
      inactiveMembers,
      paidMembers,
      unpaidMembers,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    },
    retention: {
      renewalRate: pct(renewed, opportunities),
      churnRate: pct(churned, opportunities),
    },
    payments: {
      successRate: pct(paidMembers, members.length),
      failureRate: pct(unpaidMembers, members.length),
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
