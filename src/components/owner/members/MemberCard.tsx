"use client";

import Link from "next/link";
import Image from "next/image";
import { User, Calendar, CreditCard, Clock } from "lucide-react";

import { formatInrFromDecimalString } from "@/lib/format/inr";
import type {
  MemberBillingDuration,
  MembershipStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

type MemberCardProps = {
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
  if (billingDuration === "SIX_MONTHS") return "6 months";
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

function paymentStatusInfo(paymentStatus?: PaymentStatus, amountPaid?: string, planPrice?: string) {
  if (paymentStatus === undefined || paymentStatus === null) return null;
  
  if (paymentStatus === "DONE") {
    return { label: "Paid", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-500/20" };
  }
  
  const due = planPrice && amountPaid !== undefined ? Math.max(0, Number(planPrice) - Number(amountPaid)) : null;
  
  if (paymentStatus === "PARTIAL") {
    return { label: due ? `Due ₹${due.toFixed(0)}` : "Partial", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-500/20" };
  }
  
  return { label: due ? `Due ₹${due.toFixed(0)}` : "Due", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-500/20" };
}

export function MemberCard({
  id,
  fullName,
  billingDuration,
  membershipPlanName,
  planPrice,
  endDate,
  membershipStatus,
  memberPhoto,
  joinedDate,
  paymentStatus,
  amountPaid,
}: MemberCardProps) {
  const status = statusOf(endDate, membershipStatus);
  const statusColor =
    status === "EXPIRED"
      ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
      : status === "EXPIRING_SOON"
        ? "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
        : status === "PAUSED"
          ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
          : "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400";

  const paymentInfo = paymentStatusInfo(paymentStatus, amountPaid, planPrice);

  return (
    <Link
      href={`/owner/members/${id}`}
      className="flex items-center gap-3 rounded-xl bg-card border border-border p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
        {memberPhoto ? (
          <Image
            src={memberPhoto}
            alt={fullName}
            fill
            sizes="56px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <User className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{fullName}</p>
        
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {membershipPlanName ? `${membershipPlanName} · ` : ""}
              {durationText(billingDuration)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            <span className="font-medium text-foreground/80">{formatInrFromDecimalString(planPrice)}</span>
          </div>
          {joinedDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Joined {formatDate(joinedDate)}</span>
            </div>
          )}
        </div>

        {paymentInfo && (
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${paymentInfo.color} ${paymentInfo.bgColor}`}
            >
              <CreditCard className="h-3 w-3" />
              {paymentInfo.label}
            </span>
          </div>
        )}
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}
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
