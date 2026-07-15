"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Search } from "lucide-react";

import { FilterChips } from "@/components/gym-owner/FilterChips";
import { MemberCard } from "@/components/gym-owner/MemberCard";
import type { MemberBillingDuration, MembershipStatus, PaymentStatus } from "@/generated/prisma/client";

type MemberItem = {
  id: string;
  fullName: string;
  phone: string;
  billingDuration: MemberBillingDuration;
  membershipPlanName?: string | null;
  planPrice: string;
  discountInr: string;
  endDate: string;
  membershipStatus: MembershipStatus;
  memberPhoto: string | null;
  joinedDate?: string;
  paymentStatus?: PaymentStatus;
  amountPaid?: string;
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
  const [showPlanFilters, setShowPlanFilters] = useState(false);

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members..."
            className="w-full rounded-xl bg-muted/50 border border-border py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <FilterChips
          options={[
            { id: "ALL", label: "All" },
            { id: "EXPIRING_SOON", label: "Expiring soon" },
            { id: "EXPIRED", label: "Expired" },
            { id: "PAUSED", label: "Paused" },
          ]}
          selectedValue={statusFilter}
          onSelect={(value) => setStatusFilter(value as StatusFilter)}
        />

        <button
          type="button"
          onClick={() => setShowPlanFilters(!showPlanFilters)}
          className="mt-3 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>Filter by plan</span>
          {showPlanFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showPlanFilters && (
          <FilterChips
            options={[
              { id: "ALL", label: "All plans", icon: Calendar },
              { id: "QUARTERLY", label: "Quarterly", icon: Calendar },
              { id: "MONTHLY", label: "Monthly", icon: Calendar },
              { id: "ANNUALLY", label: "Annually", icon: Calendar },
            ]}
            selectedValue={planFilter}
            onSelect={(value) => setPlanFilter(value as PlanFilter)}
          />
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-24">
        {filtered.map((m) => (
          <MemberCard key={m.id} {...m} />
        ))}
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No members found</p>
        ) : null}
      </div>
    </div>
  );
}
