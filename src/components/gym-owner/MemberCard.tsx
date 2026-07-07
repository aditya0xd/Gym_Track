"use client";

import Link from "next/link";
import { User } from "lucide-react";

import { formatInrFromDecimalString } from "@/lib/format/inr";
import type {
  MemberBillingDuration,
  MembershipStatus,
} from "@/generated/prisma/client";

type MemberCardProps = {
  id: string;
  fullName: string;
  phone: string;
  billingDuration: MemberBillingDuration;
  planPrice: string;
  discountInr: string;
  endDate: string;
  membershipStatus: MembershipStatus;
  memberPhoto: string | null;
  joinedDate?: string;
};

function statusOf(endDateIso: string, membershipStatus: MembershipStatus) {
  if (membershipStatus === "PAUSED") return "PAUSED";
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const in7 = new Date(today);
  in7.setUTCDate(in7.getUTCDate() + 7);
  const endDate = new Date(endDateIso);

  if (endDate < today) return "EXPIRED";
  if (endDate <= in7) return "EXPIRING_SOON";
  return "ACTIVE";
}

function durationText(billingDuration: MemberBillingDuration) {
  if (billingDuration === "ONE_MONTH") return "1 month";
  if (billingDuration === "THREE_MONTHS") return "3 months";
  if (billingDuration === "TWELVE_MONTHS") return "12 months";
  return billingDuration;
}

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MemberCard({
  id,
  fullName,
  phone,
  billingDuration,
  planPrice,
  discountInr,
  endDate,
  membershipStatus,
  memberPhoto,
  joinedDate,
}: MemberCardProps) {
  const status = statusOf(endDate, membershipStatus);
  const statusColor =
    status === "EXPIRED"
      ? "bg-red-500/20 text-red-400"
      : status === "EXPIRING_SOON"
        ? "bg-yellow-500/20 text-yellow-400"
        : status === "PAUSED"
          ? "bg-blue-500/20 text-blue-400"
          : "bg-green-500/20 text-green-400";

  return (
    <Link
      href={`/owner/members/${id}`}
      className="flex items-center gap-3 rounded-xl bg-gray-800/50 p-3 backdrop-blur-sm"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-700">
        {memberPhoto ? (
          <img
            src={memberPhoto}
            alt={fullName}
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-6 w-6 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{fullName}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          {durationText(billingDuration)} ·{" "}
          {formatInrFromDecimalString(planPrice)}
          {joinedDate ? ` · Joined ${formatDate(joinedDate)}` : ""}
        </p>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}
      >
        {status === "PAUSED"
          ? "Paused"
          : status === "EXPIRING_SOON"
            ? "Expiring"
            : status === "EXPIRED"
              ? "Expired"
              : "Active"}
      </span>
    </Link>
  );
}
