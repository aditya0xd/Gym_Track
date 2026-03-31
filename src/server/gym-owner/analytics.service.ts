import { prisma } from "@/lib/prisma";

type TrendPoint = {
  month: string;
  revenue: number;
  paidMembers: number;
  unpaidMembers: number;
};

export type OwnerAnalytics = {
  summary: {
    totalMembers: number;
    activeMembers: number;
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

export async function getOwnerAnalytics(adminUserId: string): Promise<OwnerAnalytics> {
  const members = await prisma.member.findMany({
    where: { adminUserId },
    select: {
      id: true,
      phone: true,
      startDate: true,
      endDate: true,
      planPrice: true,
      paymentStatus: true,
      updatedAt: true,
    },
    orderBy: { startDate: "asc" },
  });

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const currentMonthStart = monthStartFromNow(0);
  const nextMonthStart = monthStartFromNow(1);

  const activeMembers = members.filter((m) => m.endDate >= today).length;
  const inactiveMembers = members.length - activeMembers;
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

  const staleThreshold = addDays(today, -10);
  const staleActiveCount = members.filter(
    (m) => m.endDate >= today && m.updatedAt < staleThreshold,
  ).length;
  const expiringSoonCount = members.filter(
    (m) => m.endDate >= today && m.endDate <= addDays(today, 7),
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

  return {
    summary: {
      totalMembers: members.length,
      activeMembers,
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
    insights,
  };
}
