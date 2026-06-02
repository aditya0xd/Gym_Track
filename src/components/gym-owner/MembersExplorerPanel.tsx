"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatInrFromDecimalString } from "@/lib/format/inr";
import type { MemberBillingDuration, MembershipStatus } from "@/generated/prisma/client";

type MemberItem = {
  id: string;
  fullName: string;
  phone: string;
  billingDuration: MemberBillingDuration;
  planPrice: string;
  discountInr: string;
  endDate: string;
  membershipStatus: MembershipStatus;
};

type StatusFilter = "ALL" | "EXPIRING_SOON" | "EXPIRED" | "PAUSED";
type PlanFilter = "ALL" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";

function planBucket(duration: MemberBillingDuration): PlanFilter {
  if (duration === "ONE_MONTH") return "MONTHLY";
  if (duration === "THREE_MONTHS") return "QUARTERLY";
  if (duration === "TWELVE_MONTHS") return "ANNUALLY";
  return "ALL";
}

function statusOf(endDateIso: string, membershipStatus: MembershipStatus) {
  if (membershipStatus === "PAUSED") return "PAUSED";
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in7 = new Date(today);
  in7.setUTCDate(in7.getUTCDate() + 7);
  const endDate = new Date(endDateIso);

  if (endDate < today) return "EXPIRED";
  if (endDate <= in7) return "EXPIRING_SOON";
  return "ACTIVE";
}

function daysText(endDateIso: string) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endDate = new Date(endDateIso);
  const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Expired ${Math.abs(diff)}d ago`;
  return `${diff}d left`;
}

export function MembersExplorerPanel({
  members,
  initialStatusFilter = "ALL",
}: {
  members: MemberItem[];
  initialStatusFilter?: StatusFilter;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [planFilter, setPlanFilter] = useState<PlanFilter>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const status = statusOf(m.endDate, m.membershipStatus);
      if (statusFilter !== "ALL" && status !== statusFilter) return false;

      const bucket = planBucket(m.billingDuration);
      if (planFilter !== "ALL" && bucket !== planFilter) return false;

      if (!q) return true;
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q)
      );
    });
  }, [members, query, statusFilter, planFilter]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Member details</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or phone..."
        className="mt-3 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { id: "ALL", label: "All" },
          { id: "EXPIRING_SOON", label: "Expiring soon" },
          { id: "EXPIRED", label: "Expired" },
          { id: "PAUSED", label: "Paused" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStatusFilter(item.id as StatusFilter)}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              statusFilter === item.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {[
          { id: "ALL", label: "All plans" },
          { id: "QUARTERLY", label: "Quarterly" },
          { id: "MONTHLY", label: "Monthly" },
          { id: "ANNUALLY", label: "Annually" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPlanFilter(item.id as PlanFilter)}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              planFilter === item.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{filtered.length} members</p>

      <div className="mt-2 space-y-2">
        {filtered.map((m) => {
          const status = statusOf(m.endDate, m.membershipStatus);
          const tone =
            status === "EXPIRED"
              ? "border-border bg-background text-foreground"
              : status === "EXPIRING_SOON"
                ? "border-border bg-background text-foreground"
                : status === "PAUSED"
                  ? "border-border bg-muted text-foreground"
                  : "border-border bg-background text-foreground";

          return (
            <Link
              key={m.id}
              href={`/owner/members/${m.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{m.fullName}</p>
                <p className="text-xs text-muted-foreground">{m.phone}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatInrFromDecimalString(m.planPrice)}
                  {Number(m.discountInr) > 0 ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      (−{formatInrFromDecimalString(m.discountInr)} off list)
                    </span>
                  ) : null}
                  <span className="text-xs font-normal text-muted-foreground">/plan</span>
                </p>
              </div>
              <div className="text-right">
                <span className={`rounded-md border px-2 py-1 text-xs ${tone}`}>
                  {status === "PAUSED"
                    ? "Paused"
                    : status === "EXPIRING_SOON"
                      ? "Expiring soon"
                      : status === "EXPIRED"
                        ? "Expired"
                        : "Active"}
                </span>
                <p className="mt-2 text-xs text-muted-foreground">{daysText(m.endDate)}</p>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No members match filters.</p>
        ) : null}
      </div>
    </div>
  );
}
