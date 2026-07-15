import Link from "next/link";
import { MemberCard } from "@/components/gym-owner/MemberCard";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { PageShell } from "@/components/shared/PageShell";
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
  return (
    MEMBER_BILLING_DURATION_OPTIONS.find((o) => o.value === value)?.label ??
    value
  );
}

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  const hasAnalytics = await hasGymOwnerPlanFeature(session, "ANALYTICS");

  const members = await listMembersForOwner(session.user.id);
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const in7Days = new Date(today);
  in7Days.setUTCDate(in7Days.getUTCDate() + 7);
  const in30Days = new Date(today);
  in30Days.setUTCDate(in30Days.getUTCDate() + 30);

  const totalMembers = members.length;
  const activeMembers = members.filter(
    (m) => m.endDate >= today && m.membershipStatus === "ACTIVE",
  ).length;
  const pausedMembers = members.filter(
    (m) => m.membershipStatus === "PAUSED",
  ).length;
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
  const revenueAtRiskWeek = expiringSoon.reduce(
    (sum, m) => sum + Number(m.planPrice),
    0,
  );
  const revenueAtRiskMonth = expiringThisMonth.reduce(
    (sum, m) => sum + Number(m.planPrice),
    0,
  );
  const revenueLost = expiredMembers.reduce(
    (sum, m) => sum + Number(m.planPrice),
    0,
  );
  const recentMembers = members.slice(0, 6);
  const todayLabel = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background px-4 pt-4">
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 space-y-4 pb-4">
          <div className="flex items-start justify-between gap-3 pt-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Gym Owner
              </p>
              <div className="mt-1 flex items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                  GymTrack Pro
                </h1>
                <div className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground font-medium">
                {todayLabel}
              </p>
            </div>
          </div>

          <RevenueAtRiskCard
            weekRevenue={revenueAtRiskWeek}
            weekCount={expiringSoon.length}
            monthRevenue={revenueAtRiskMonth}
            monthCount={expiringThisMonth.length}
          />
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pb-24">
          <div className="grid grid-cols-2 gap-3">
            {/* Total Members */}
            <Link
              href="/owner/members?status=all"
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 flex flex-col justify-between min-h-[110px]"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black tracking-tight text-foreground">
                  {totalMembers}
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total
                </p>
              </div>
            </Link>

            {/* Active Members */}
            <Link
              href="/owner/members?status=active"
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 flex flex-col justify-between min-h-[110px]"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <svg
                  className="h-4 w-4 stroke-[2.5]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black tracking-tight text-foreground">
                  {activeMembers}
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active
                </p>
              </div>
            </Link>

            {/* Expiring Members */}
            <Link
              href="/owner/members?status=expiring"
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 flex flex-col justify-between min-h-[110px]"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <svg
                  className="h-4 w-4 stroke-[2.5]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black tracking-tight text-foreground">
                  {expiringSoon.length}
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Expiring
                </p>
              </div>
            </Link>

            {/* Paused Members */}
            <Link
              href="/owner/members?status=paused"
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 flex flex-col justify-between min-h-[110px]"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                <svg
                  className="h-4 w-4 stroke-[2.5]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.25 9v6m-4.5-6v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black tracking-tight text-foreground">
                  {pausedMembers}
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Paused
                </p>
              </div>
            </Link>
          </div>

          {/* Expired and Revenue Lost combined card */}
          <div className="grid grid-cols-2 divide-x divide-border rounded-2xl border border-border bg-card p-4">
            <Link
              href="/owner/members?status=expired"
              className="px-2 hover:opacity-85 transition-opacity"
            >
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Expired
              </p>
              <p className="mt-1.5 text-3xl font-black text-foreground">
                {expiredMembers.length}
              </p>
            </Link>
            {hasAnalytics ? (
              <Link
                href="/owner/analytics"
                className="pl-4 pr-2 min-w-0 hover:opacity-85 transition-opacity"
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  Revenue Lost
                </p>
                <p
                  className="mt-1.5 text-2xl md:text-3xl font-black text-red-500 truncate"
                  title={formatInrFromDecimalString(revenueLost.toFixed(2))}
                >
                  {formatInrFromDecimalString(revenueLost.toFixed(0))}
                </p>
              </Link>
            ) : (
              <div className="pl-4 pr-2 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  Revenue Lost
                </p>
                <p className="mt-1.5 text-2xl md:text-3xl font-black text-red-500">
                  —
                </p>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  Upgrade to unlock analytics
                </p>
              </div>
            )}
          </div>

          <p className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">
            Recent Members
          </p>
          <div className="space-y-3 pb-24">
            {recentMembers.map((m) => (
              <MemberCard
                key={m.id}
                id={m.id}
                fullName={m.fullName}
                phone={m.phone}
                billingDuration={m.billingDuration}
                membershipPlanName={m.membershipPlanName}
                planPrice={m.planPrice.toString()}
                discountInr={m.discountInr.toString()}
                endDate={m.endDate.toISOString()}
                membershipStatus={m.membershipStatus}
                memberPhoto={m.memberPhoto}
                joinedDate={m.startDate.toISOString()}
                paymentStatus={m.paymentStatus}
                amountPaid={m.amountPaid.toString()}
              />
            ))}
            {recentMembers.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No members yet.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
