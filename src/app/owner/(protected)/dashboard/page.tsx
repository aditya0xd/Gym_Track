import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { RevenueAtRiskCard } from "@/components/gym-owner/RevenueAtRiskCard";
import { authOptions } from "@/lib/auth";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import { hasGymOwnerPlanFeature } from "@/lib/plan-features/guard";
import { listMembersForOwner } from "@/server/gym-owner/member.service";
import { Users } from "lucide-react";

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

  const hasAnalytics = await hasGymOwnerPlanFeature(session, "ANALYTICS");

  const members = await listMembersForOwner(session.user.id);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in7Days = new Date(today);
  in7Days.setUTCDate(in7Days.getUTCDate() + 7);
  const in30Days = new Date(today);
  in30Days.setUTCDate(in30Days.getUTCDate() + 30);

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
  const expiringThisMonth = members.filter(
    (m) =>
      m.endDate >= today &&
      m.endDate <= in30Days &&
      m.membershipStatus === "ACTIVE",
  );
  const expiredMembers = members.filter((m) => m.endDate < today);
  const revenueAtRiskWeek = expiringSoon.reduce((sum, m) => sum + Number(m.planPrice), 0);
  const revenueAtRiskMonth = expiringThisMonth.reduce((sum, m) => sum + Number(m.planPrice), 0);
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
        <div className="flex items-start justify-between gap-3 pt-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-lime-400">Gym Owner</p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">GymTrack Pro</h1>
              <div className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground font-medium">{todayLabel}</p>
          </div>
        </div>

        <RevenueAtRiskCard
          weekRevenue={revenueAtRiskWeek}
          weekCount={expiringSoon.length}
          monthRevenue={revenueAtRiskMonth}
          monthCount={expiringThisMonth.length}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Total Members */}
          <Link href="/owner/members?status=all" className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 flex flex-col justify-between min-h-[110px]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-400/10 text-lime-400">
              <Users className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black tracking-tight text-foreground">{totalMembers}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
            </div>
          </Link>

          {/* Active Members */}
          <Link href="/owner/members?status=active" className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 flex flex-col justify-between min-h-[110px]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black tracking-tight text-foreground">{activeMembers}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Active</p>
            </div>
          </Link>

          {/* Expiring Members */}
          <Link href="/owner/members?status=expiring" className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 flex flex-col justify-between min-h-[110px]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black tracking-tight text-foreground">{expiringSoon.length}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Expiring</p>
            </div>
          </Link>

          {/* Paused Members */}
          <Link href="/owner/members?status=paused" className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 flex flex-col justify-between min-h-[110px]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
              <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5-6v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black tracking-tight text-foreground">{pausedMembers}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Paused</p>
            </div>
          </Link>
        </div>

        {/* Expired and Revenue Lost combined card */}
        <div className="grid grid-cols-2 divide-x divide-border rounded-2xl border border-border bg-card p-4">
          <Link href="/owner/members?status=expired" className="px-2 hover:opacity-85 transition-opacity">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Expired</p>
            <p className="mt-1.5 text-3xl font-black text-foreground">{expiredMembers.length}</p>
          </Link>
          {hasAnalytics ? (
            <Link href="/owner/analytics" className="pl-4 pr-2 min-w-0 hover:opacity-85 transition-opacity">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">Revenue Lost</p>
              <p className="mt-1.5 text-2xl md:text-3xl font-black text-red-500 truncate" title={formatInrFromDecimalString(revenueLost.toFixed(2))}>
                {formatInrFromDecimalString(revenueLost.toFixed(0))}
              </p>
            </Link>
          ) : (
            <div className="pl-4 pr-2 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">Revenue Lost</p>
              <p className="mt-1.5 text-2xl md:text-3xl font-black text-red-500">—</p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                Upgrade to unlock analytics
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">Recent Members</p>
          <div className="rounded-2xl border border-border bg-card p-4 divide-y divide-border/60">
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
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      {m.memberPhoto ? (
                        <img src={m.memberPhoto} alt={m.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm font-bold text-foreground">
                          {m.fullName[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{m.fullName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {durationLabel(m.billingDuration)} · {formatInrFromDecimalString(m.planPrice.toString())}
                        {Number(m.discountInr) > 0 ? (
                          <span className="text-muted-foreground/90">
                            {" "}
                            (−{formatInrFromDecimalString(m.discountInr.toString())} off list)
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                    status === "Active"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : status === "Paused"
                        ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                        : status === "Expiring soon"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-500"
                          : "border-red-500/20 bg-red-500/10 text-red-500"
                  }`}>
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
