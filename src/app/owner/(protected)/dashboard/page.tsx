import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import { listMembersForOwner } from "@/server/gym-owner/member.service";

export const metadata = {
  title: "Dashboard | Gym owner",
};

function durationLabel(value: string) {
  return MEMBER_BILLING_DURATION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  const members = await listMembersForOwner(session.user.id);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in7Days = new Date(today);
  in7Days.setUTCDate(in7Days.getUTCDate() + 7);

  const totalMembers = members.length;
  const activeMembers = members.filter(
    (m) => m.endDate >= today && m.membershipStatus === "ACTIVE",
  ).length;
  const pausedMembers = members.filter((m) => m.membershipStatus === "PAUSED").length;
  const expiringSoon = members.filter(
    (m) =>
      m.endDate >= today &&
      m.endDate <= in7Days &&
      m.membershipStatus === "ACTIVE",
  );
  const expiredMembers = members.filter((m) => m.endDate < today);
  const revenueAtRisk = expiringSoon.reduce((sum, m) => sum + Number(m.planPrice), 0);
  const revenueLost = expiredMembers.reduce((sum, m) => sum + Number(m.planPrice), 0);
  const recentMembers = members.slice(0, 6);
  const todayLabel = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const statCards = [
    { label: "Total", value: totalMembers, accent: "border-border", href: "/owner/members?status=all" },
    { label: "Active", value: activeMembers, accent: "border-border", href: "/owner/members?status=active" },
    {
      label: "Expiring",
      value: expiringSoon.length,
      accent: "border-border",
      href: "/owner/members?status=expiring",
    },
    { label: "Paused", value: pausedMembers, accent: "border-border", href: "/owner/members?status=paused" },
    { label: "Expired", value: expiredMembers.length, accent: "border-border", href: "/owner/members?status=expired" },
  ];

  return (
    <PageShell>
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">GymTrack Pro</h1>
              <p className="mt-1 text-xs text-muted-foreground">{todayLabel}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/owner/members/new">Enroll member</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-foreground p-4 text-background">
          <p className="text-xs uppercase tracking-wide text-background/80">Revenue at risk</p>
          <p className="mt-2 text-3xl font-bold">
            {formatInrFromDecimalString(revenueAtRisk.toFixed(2))}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-background/80">
              from {expiringSoon.length} expiring members this week
            </p>
            <Button size="sm" variant="secondary" asChild>
              <Link href="/owner/analytics">Week</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`rounded-xl border ${card.accent} bg-card p-3 transition-colors hover:bg-muted/40`}
            >
              <p className="text-3xl font-bold text-foreground">{card.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Revenue lost (expired)
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatInrFromDecimalString(revenueLost.toFixed(2))}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent members</p>
          <div className="mt-3 divide-y divide-border">
            {recentMembers.map((m) => {
              const status =
                m.membershipStatus === "PAUSED"
                  ? "Paused"
                  : m.endDate < today
                    ? "Expired"
                    : m.endDate <= in7Days
                      ? "Expiring soon"
                      : "Active";
              return (
                <Link
                  key={m.id}
                  href={`/owner/members/${m.id}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{m.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {durationLabel(m.billingDuration)} ·{" "}
                      {formatInrFromDecimalString(m.planPrice.toString())}
                      {Number(m.discountInr) > 0 ? (
                        <span className="text-muted-foreground/90">
                          {" "}
                          (−{formatInrFromDecimalString(m.discountInr.toString())} off list)
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground">
                    {status}
                  </span>
                </Link>
              );
            })}
            {recentMembers.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No members yet.</p>
            ) : null}
          </div>
        </div>

      </div>
    </PageShell>
  );
}
