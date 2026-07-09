"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  User,
  Phone,
  Mail,
  MessageCircle,
  Camera,
  Upload,
  X,
  ReceiptText,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import { IMAGE_ACCEPT, IMAGE_PROCESSING_PRESETS } from "@/lib/image-processing/config";
import {
  imageErrorMessage as sharedImageErrorMessage,
  processImage,
} from "@/lib/image-processing/client";
import type {
  MemberBillingDuration,
  MembershipStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

interface ReminderItem {
  id: string;
  channel: string;
  sentAt: string;
  status: string;
  message: string;
}

interface PaymentHistoryItem {
  id: string;
  billingDuration: MemberBillingDuration;
  planPrice: string;
  discountInr: string;
  amountPaid: string;
  periodStart: string;
  periodEnd: string;
  paymentStatus: PaymentStatus;
  paymentProvider: string;
  paidAt: string | null;
  createdAt: string;
}

interface MemberDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  billingDuration: MemberBillingDuration;
  planPrice: string;
  discountInr: string;
  amountPaid: string;
  paymentStatus: PaymentStatus;
  startDate: string;
  endDate: string;
  membershipStatus: MembershipStatus;
  pausedAt: string | null;
  whatsappEnabled: boolean;
  memberPhoto: string | null;
  upiScreenshot: string | null;
  createdAt: string;
  reminders: ReminderItem[];
  renewals: PaymentHistoryItem[];
}

type PriceHint = { duration: MemberBillingDuration; priceInr: string | null };

function durationLabel(value: string) {
  return (
    MEMBER_BILLING_DURATION_OPTIONS.find((o) => o.value === value)?.label ??
    value
  );
}

function daysLeft(endDateStr: string) {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const endDate = new Date(endDateStr);
  return Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function totalDays(startDateStr: string, endDateStr: string) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function paymentStatusTone(status: PaymentStatus) {
  if (status === "DONE") {
    return "bg-[#0d2e12] text-[#4ade80]";
  }
  if (status === "PARTIAL") {
    return "bg-[#3d2e00] text-yellow-400";
  }
  return "bg-[#3d1a1a] text-red-400";
}

function paymentStatusLabel(status: PaymentStatus) {
  if (status === "DONE") return "Paid";
  if (status === "PARTIAL") return "Partial";
  return "Due";
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/** SVG arc gauge showing days remaining */
function DaysArc({ remaining, total }: { remaining: number; total: number }) {
  const clampedRemaining = Math.max(0, remaining);
  const clampedTotal = Math.max(1, total);
  const fraction = Math.min(1, clampedRemaining / clampedTotal);

  const cx = 60,
    cy = 65,
    r = 44;
  const startAngle = -210;
  const endAngle = 30;
  const totalSweep = endAngle - startAngle; // 240°

  function polarToXY(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const arcStart = polarToXY(startAngle);
  const arcEnd = polarToXY(endAngle);
  const progressAngle = startAngle + totalSweep * fraction;
  const progressEnd = polarToXY(progressAngle);
  const largeArc = totalSweep * fraction > 180 ? 1 : 0;

  const endDateObj = new Date(
    new Date().setDate(new Date().getDate() + clampedRemaining),
  );
  const endLabel = endDateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col items-center mt-1">
      <svg
        width="120"
        height="80"
        viewBox="0 0 120 95"
        className="overflow-visible"
      >
        {/* Track */}
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Progress */}
        {fraction > 0 && (
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${progressEnd.x} ${progressEnd.y}`}
            fill="none"
            stroke="#d4ff00"
            strokeWidth="7"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="flex w-full justify-between px-1 -mt-1 text-[10px] text-gray-400">
        <span>{clampedTotal}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}

async function fetchMember(id: string): Promise<MemberDetail> {
  const res = await fetch(`/api/owner/members/${id}`);
  if (!res.ok) throw new Error("Failed to fetch member details");
  return res.json();
}

export function MemberDetailsClient({ id }: { id: string }) {
  const router = useRouter();
  const renewalUpiInputRef = useRef<HTMLInputElement>(null);
  const {
    data: member,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["member", id],
    queryFn: () => fetchMember(id),
  });
  const [sendingType, setSendingType] = useState<
    "MEMBERSHIP_EXPIRY" | "PAYMENT_DUE" | null
  >(null);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [priceHints, setPriceHints] = useState<PriceHint[]>([]);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [renewalDuration, setRenewalDuration] =
    useState<MemberBillingDuration>("ONE_MONTH");
  const [renewalPeriodStart, setRenewalPeriodStart] = useState("");
  const [renewalDiscount, setRenewalDiscount] = useState("");
  const [renewalPaymentStatus, setRenewalPaymentStatus] =
    useState<PaymentStatus>("NOT_DONE");
  const [renewalAmountPaid, setRenewalAmountPaid] = useState("");
  const [renewalUpiFile, setRenewalUpiFile] = useState<File | null>(null);
  const [clearDuesDialog, setClearDuesDialog] = useState<{
    isOpen: boolean;
    renewalId: string;
    planPrice: string;
  }>({ isOpen: false, renewalId: "", planPrice: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/owner/pricing");
      if (!res.ok) return;
      const data = (await res.json()) as { prices: PriceHint[] };
      if (!cancelled) setPriceHints(data.prices ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }, []);
  const renewalPrice =
    priceHints.find((h) => h.duration === renewalDuration)?.priceInr ?? null;
  const renewalFinalAmount = useMemo(() => {
    if (!renewalPrice) return null;
    const list = Number(renewalPrice);
    const discount =
      renewalDiscount.trim() === "" ? 0 : Number(renewalDiscount);
    if (!Number.isFinite(list) || !Number.isFinite(discount) || discount < 0) {
      return null;
    }
    return Math.max(0, list - discount).toFixed(2);
  }, [renewalDiscount, renewalPrice]);

  useEffect(() => {
    if (member && !renewalPeriodStart) {
      const next = new Date(member.endDate);
      next.setUTCDate(next.getUTCDate() + 1);
      const start = next > today ? next : today;
      setRenewalPeriodStart(start.toISOString().slice(0, 10));
    }
  }, [member, renewalPeriodStart, today]);

  useEffect(() => {
    if (renewalPaymentStatus === "DONE" && renewalFinalAmount) {
      setRenewalAmountPaid(renewalFinalAmount);
    }
    if (renewalPaymentStatus === "NOT_DONE") {
      setRenewalAmountPaid("");
    }
  }, [renewalFinalAmount, renewalPaymentStatus]);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4ff00]" />
        <p className="text-sm text-gray-400">Loading member details…</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] p-8 text-center">
        <p className="text-sm font-semibold text-red-400">
          Failed to load member details
        </p>
        <p className="text-xs text-gray-500">
          {(error as Error)?.message || "Member not found"}
        </p>
      </div>
    );
  }

  const in7Days = new Date(today);
  in7Days.setUTCDate(in7Days.getUTCDate() + 7);
  const endDate = new Date(member.endDate);

  const status =
    member.membershipStatus === "PAUSED"
      ? "Paused"
      : endDate < today
        ? "Expired"
        : endDate <= in7Days
          ? "Expiring Soon"
          : "Active";

  const canPause = member.membershipStatus === "ACTIVE" && endDate >= today;

  const remaining = daysLeft(member.endDate);
  const total = totalDays(member.startDate, member.endDate);

  async function applyMembership(action: "pause" | "resume") {
    setPauseLoading(true);
    try {
      const res = await fetch(
        `/api/owner/members/${member!.id}/membership-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message ?? "Could not update membership.");
        return;
      }
      toast.success(data.message ?? "Updated.");
      refetch();
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setPauseLoading(false);
    }
  }

  async function sendReminder(
    reminderType: "MEMBERSHIP_EXPIRY" | "PAYMENT_DUE",
  ) {
    setSendingType(reminderType);
    try {
      const res = await fetch(`/api/owner/members/${member!.id}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderType }),
      });
      const data = (await res.json()) as {
        message?: string;
        reminder?: { channel?: string; reminderType?: string };
      };
      if (!res.ok) {
        toast.error(data.message ?? "Could not send reminder.");
        return;
      }
      const kind =
        reminderType === "PAYMENT_DUE" ? "payment due" : "membership expiry";
      toast.success(
        `Sent ${kind} reminder via ${data.reminder?.channel ?? "channel"}.`,
      );
      refetch();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSendingType(null);
    }
  }

  async function handleClearDues(renewalId: string, planPrice: string) {
    setClearDuesDialog({ isOpen: true, renewalId, planPrice });
  }

  async function confirmClearDues() {
    const { renewalId, planPrice } = clearDuesDialog;
    setClearDuesDialog({ ...clearDuesDialog, isOpen: false });
    
    try {
      const res = await fetch(
        `/api/owner/members/${member!.id}/renewals/${renewalId}/clear-dues`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: "DONE" }),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message ?? "Could not clear dues.");
        return;
      }
      toast.success(data.message ?? "Dues cleared successfully.");
      refetch();
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    }
  }

  const statusStyles: Record<
    string,
    { bg: string; text: string; dot: string }
  > = {
    Active: { bg: "bg-[#0d2e12]", text: "text-[#4ade80]", dot: "bg-[#4ade80]" },
    "Expiring Soon": {
      bg: "bg-[#3d2e00]",
      text: "text-yellow-400",
      dot: "bg-yellow-400",
    },
    Paused: { bg: "bg-[#1a2a3d]", text: "text-blue-400", dot: "bg-blue-400" },
    Expired: { bg: "bg-[#3d1a1a]", text: "text-red-400", dot: "bg-red-400" },
  };
  const sc = statusStyles[status] ?? statusStyles["Active"];

  const planLabel = durationLabel(member.billingDuration);
  const planPrice = formatInrFromDecimalString(member.planPrice);
  const amountPaid = formatInrFromDecimalString(member.amountPaid);
  const balanceDue = formatInrFromDecimalString(
    Math.max(0, Number(member.planPrice) - Number(member.amountPaid)).toFixed(2),
  );
  async function renewMembership() {
    if (!member) return;
    if (status !== "Expired") {
      toast.error("Only expired memberships can be renewed from here.");
      return;
    }
    if (!renewalPrice) {
      toast.error("Set this duration's INR price under Pricing before renewing.");
      return;
    }
    if (!renewalPeriodStart) {
      toast.error("Choose a renewal start date.");
      return;
    }
    if (renewalPaymentStatus !== "NOT_DONE" && !renewalUpiFile) {
      toast.error("Upload UPI screenshot when payment is recorded.");
      return;
    }

    setRenewing(true);
    let upiScreenshot: string | null = null;
    if (renewalUpiFile) {
      try {
        const processed = await processImage(
          renewalUpiFile,
          IMAGE_PROCESSING_PRESETS.upiScreenshot,
        );
        upiScreenshot = processed.dataUrl;
      } catch (err) {
        toast.error(sharedImageErrorMessage(err, "UPI screenshot"));
        setRenewing(false);
        return;
      }
    }

    try {
      const amountPaid = renewalAmountPaid.trim();
      const res = await fetch(`/api/owner/members/${member.id}/renewal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingDuration: renewalDuration,
          periodStart: renewalPeriodStart,
          paymentStatus: renewalPaymentStatus,
          discountInr: renewalDiscount.trim() === "" ? undefined : renewalDiscount.trim(),
          amountPaid: amountPaid === "" ? undefined : amountPaid,
          upiScreenshot,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message ?? "Could not renew membership.");
        return;
      }
      toast.success(data.message ?? "Membership renewed.");
      setRenewalOpen(false);
      setRenewalUpiFile(null);
      await refetch();
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setRenewing(false);
    }
  }

  function onRenewalUpiChange(e: ChangeEvent<HTMLInputElement>) {
    setRenewalUpiFile(e.target.files?.[0] ?? null);
  }

  return (
    <>
      {/* Page title */}
      <div className="mb-4 pt-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4ff00]">
          Member
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          {member.fullName}
        </h1>
      </div>

      <div className="space-y-3 pb-24">
        {/* ── Header Card: Avatar + Name + Status + Actions ── */}
        <div className="rounded-2xl bg-[#1c1c1c] p-4">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#2a2a2a]">
              {member.memberPhoto ? (
                <img
                  src={member.memberPhoto}
                  alt={member.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#2a2a2a]">
                  <User className="h-7 w-7 text-gray-500" />
                </div>
              )}
            </div>
            <div>
              <p className="text-base font-bold text-white">
                {member.fullName}
              </p>
              <span
                className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sc.bg} ${sc.text}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                {status}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-4 border-t border-[#2a2a2a]" />

          {/* Action buttons — horizontal full-width row */}
          <div className="mt-4 flex w-full items-center gap-2">
            <Link
              href={`/owner/members/${member.id}/edit`}
              id="member-edit-btn"
              className="flex flex-1 items-center justify-center rounded-full bg-[#d4ff00] py-2.5 text-xs font-extrabold uppercase tracking-wider text-black transition-opacity hover:opacity-90 active:scale-95"
            >
              Edit
            </Link>
            <button
              id="member-pause-btn"
              onClick={() =>
                applyMembership(
                  member.membershipStatus === "PAUSED" ? "resume" : "pause",
                )
              }
              disabled={
                (!canPause && member.membershipStatus !== "PAUSED") ||
                pauseLoading
              }
              className="flex flex-2 items-center justify-center rounded-full bg-[#d4ff00] py-2.5 text-xs font-extrabold uppercase tracking-wider text-black transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-40"
            >
              {pauseLoading
                ? "…"
                : member.membershipStatus === "PAUSED"
                  ? "Resume"
                  : "Pause/Freeze"}
            </button>
            <button
              id="member-logs-btn"
              onClick={() => setRenewalOpen(true)}
              disabled={status !== "Expired"}
              className="flex flex-1 items-center justify-center rounded-full bg-[#d4ff00] py-2.5 text-xs font-extrabold uppercase tracking-wider text-black transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-40"
            >
              Renew
            </button>
          </div>
        </div>

        {/* ── Plan + Days Left card ── */}
        <div className="rounded-2xl bg-[#1c1c1c] overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-[#2a2a2a]">
            {/* Plan */}
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Plan
              </p>
              <p className="mt-1 text-sm font-extrabold text-white leading-snug">
                {planLabel}
                <span className="block text-sm font-semibold text-gray-300">
                  ({planPrice})
                </span>
              </p>
              <div className="mt-4 space-y-1">
                <p className="text-[11px] text-gray-400">
                  Paid: <span className="text-gray-200">{amountPaid}</span>
                </p>
                <p className="text-[11px] text-gray-400">
                  Due: <span className="text-gray-200">{balanceDue}</span>
                </p>
                <p className="text-[11px] text-gray-400">
                  Starts:{" "}
                  <span className="text-gray-200">
                    {formatDate(member.startDate)}
                  </span>
                </p>
                <p className="text-[11px] text-gray-400">
                  Ends:{" "}
                  <span className="text-gray-200">
                    {formatDate(member.endDate)}
                  </span>
                </p>
              </div>
            </div>

            {/* Days left */}
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Days Left
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-white">
                {remaining > 0
                  ? `${remaining} Days Remaining`
                  : remaining === 0
                    ? "Ends today"
                    : "Expired"}
              </p>
              <DaysArc remaining={remaining} total={total} />
            </div>
          </div>
        </div>

        {/* ── Information card ── */}
        <div className="rounded-2xl bg-[#1c1c1c] p-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-white">
            Information
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2a2a2a]">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <span className="text-sm text-gray-200">{member.phone}</span>
            </div>
            {member.email && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2a2a2a]">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <span className="text-sm text-gray-200">{member.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2a2a2a]">
                <MessageCircle className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <span className="text-sm text-gray-200">
                WhatsApp: {member.whatsappEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>

   

        {/* Member Logs */}
        <div className="rounded-2xl bg-[#1c1c1c] p-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-white">
            Member Logs
          </p>
          {member.reminders.length === 0 ? (
            <p className="text-sm text-gray-500">No reminders sent yet.</p>
          ) : (
            <div className="space-y-3">
              {member.reminders.map((r) => (
                <div key={r.id}>
                  <p className="text-xs text-gray-400">
                    {r.channel} · {formatDate(r.sentAt)}{" "}
                    <span className="rounded bg-[#2a2a2a] px-1.5 py-0.5 text-[10px] uppercase text-gray-300">
                      {r.status}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-white">{r.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Quick send buttons 
          disabled={sendingType !== null}*/}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              id="send-expiry-reminder-btn"
              onClick={() => sendReminder("MEMBERSHIP_EXPIRY")}
              disabled
              className="rounded-full border border-[#d4ff00]/40 px-3 py-1 text-xs font-semibold text-[#d4ff00] transition-colors hover:bg-[#d4ff00]/10 disabled:opacity-40"
            >
              {sendingType === "MEMBERSHIP_EXPIRY"
                ? "Sending…"
                : "Send expiry reminder"}
            </button>
            <button
              id="send-payment-reminder-btn"
              onClick={() => sendReminder("PAYMENT_DUE")}
              disabled
              className="rounded-full border border-[#d4ff00]/40 px-3 py-1 text-xs font-semibold text-[#d4ff00] transition-colors hover:bg-[#d4ff00]/10 disabled:opacity-40"
            >
              {sendingType === "PAYMENT_DUE"
                ? "Sending…"
                : "Send payment reminder"}
            </button>
          </div>
        </div>

             {/* Payment History */}
        <div className="rounded-2xl bg-[#1c1c1c] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-white">
              Payment History
            </p>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2a2a2a]">
              <ReceiptText className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>

          {!member.paymentStatus && member.renewals.length === 0 ? (
            <p className="text-sm text-gray-500">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {/* Initial payment */}
              {member.paymentStatus && (
                <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">
                        Initial Membership
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {formatDate(member.startDate)} to {formatDate(member.endDate)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${paymentStatusTone(
                        member.paymentStatus,
                      )}`}
                    >
                      {paymentStatusLabel(member.paymentStatus)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                    <p>
                      Charged:{" "}
                      <span className="font-semibold text-gray-200">
                        {formatInrFromDecimalString(member.planPrice)}
                      </span>
                    </p>
                    <p>
                      Paid:{" "}
                      <span className="font-semibold text-gray-200">
                        {formatInrFromDecimalString(member.amountPaid)}
                      </span>
                    </p>
                    <p>
                      Due:{" "}
                      <span className="font-semibold text-gray-200">
                        {formatInrFromDecimalString(
                          Math.max(0, Number(member.planPrice) - Number(member.amountPaid)).toFixed(2),
                        )}
                      </span>
                    </p>
                    <p>
                      Provider:{" "}
                      <span className="font-semibold text-gray-200">
                        {member.upiScreenshot ? "UPI" : "Manual"}
                      </span>
                    </p>
                  </div>

                  <p className="mt-2 text-[10px] uppercase tracking-wider text-gray-500">
                    Recorded {formatDate(member.createdAt)}
                  </p>

                  {member.paymentStatus !== "DONE" && (
                    <button
                      onClick={() => handleClearDues("initial", member.planPrice)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2a2a2a] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3a3a3a]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Clear Dues
                    </button>
                  )}
                </div>
              )}

              {member.renewals.map((payment) => {
                const due = Math.max(
                  0,
                  Number(payment.planPrice) - Number(payment.amountPaid),
                ).toFixed(2);

                return (
                  <div
                    key={payment.id}
                    className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">
                          {durationLabel(payment.billingDuration)}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {formatDate(payment.periodStart)} to {formatDate(payment.periodEnd)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${paymentStatusTone(
                          payment.paymentStatus,
                        )}`}
                      >
                        {paymentStatusLabel(payment.paymentStatus)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                      <p>
                        Charged:{" "}
                        <span className="font-semibold text-gray-200">
                          {formatInrFromDecimalString(payment.planPrice)}
                        </span>
                      </p>
                      <p>
                        Paid:{" "}
                        <span className="font-semibold text-gray-200">
                          {formatInrFromDecimalString(payment.amountPaid)}
                        </span>
                      </p>
                      <p>
                        Due:{" "}
                        <span className="font-semibold text-gray-200">
                          {formatInrFromDecimalString(due)}
                        </span>
                      </p>
                      <p>
                        Provider:{" "}
                        <span className="font-semibold text-gray-200">
                          {payment.paymentProvider}
                        </span>
                      </p>
                    </div>

                    <p className="mt-2 text-[10px] uppercase tracking-wider text-gray-500">
                      Recorded {formatDate(payment.createdAt)}
                      {payment.paidAt ? ` - Paid ${formatDate(payment.paidAt)}` : ""}
                    </p>

                    {payment.paymentStatus !== "DONE" && (
                      <button
                        onClick={() => handleClearDues(payment.id, payment.planPrice)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2a2a2a] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3a3a3a]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Clear Dues
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Upload Documents card ── */}
        <div className="rounded-2xl bg-[#1c1c1c] p-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-white">
            Upload Documents
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Member Photo */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Member Photo
              </p>
              <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2f2f2f] bg-[#141414] overflow-hidden transition-colors hover:border-[#d4ff00]/40">
                {member.memberPhoto ? (
                  <img
                    src={member.memberPhoto}
                    alt={`${member.fullName} photo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <Camera className="h-7 w-7 text-gray-500" />
                    <span className="text-xs text-gray-500">Add Photo</span>
                  </>
                )}
              </div>
            </div>

            {/* UPI Screenshot */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                UPI Payment
              </p>
              <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2f2f2f] bg-[#141414] overflow-hidden transition-colors hover:border-[#d4ff00]/40">
                {member.upiScreenshot ? (
                  <img
                    src={member.upiScreenshot}
                    alt={`UPI screenshot for ${member.fullName}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <>
                    <Upload className="h-7 w-7 text-gray-500" />
                    <span className="text-xs text-gray-500">Upload</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {renewalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 sm:items-center sm:justify-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[#18181b] p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4ff00]">
                  Renewal
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-white">
                  Renew {member.fullName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRenewalOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Plan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MEMBER_BILLING_DURATION_OPTIONS.map((option) => {
                    const selected = renewalDuration === option.value;
                    const price =
                      priceHints.find((h) => h.duration === option.value)
                        ?.priceInr ?? null;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRenewalDuration(option.value)}
                        className={`rounded-xl border-2 p-3 text-left transition-colors ${
                          selected
                            ? "border-[#d4ff00] bg-[#d4ff00]/10"
                            : "border-transparent bg-[#27272a] hover:bg-zinc-700"
                        }`}
                      >
                        <span className="block text-xs font-bold text-white">
                          {durationLabel(option.value)}
                        </span>
                        <span className="mt-1 block text-sm font-black text-[#d4ff00]">
                          {price ? formatInrFromDecimalString(price) : "No price"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label
                    htmlFor="renewalStart"
                    className="ml-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400"
                  >
                    Start date
                  </label>
                  <input
                    id="renewalStart"
                    type="date"
                    value={renewalPeriodStart}
                    onChange={(e) => setRenewalPeriodStart(e.target.value)}
                    className="flex h-12 w-full rounded-xl border-0 bg-[#27272a] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff00]"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="renewalDiscount"
                    className="ml-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400"
                  >
                    Discount
                  </label>
                  <input
                    id="renewalDiscount"
                    inputMode="decimal"
                    value={renewalDiscount}
                    onChange={(e) =>
                      setRenewalDiscount(e.target.value.replace(/[^\d.]/g, ""))
                    }
                    placeholder="0"
                    className="flex h-12 w-full rounded-xl border-0 bg-[#27272a] px-3 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff00]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="renewalPaymentStatus"
                  className="ml-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400"
                >
                  Payment status
                </label>
                <select
                  id="renewalPaymentStatus"
                  value={renewalPaymentStatus}
                  onChange={(e) => {
                    const next = e.target.value as PaymentStatus;
                    setRenewalPaymentStatus(next);
                    if (next === "DONE" && renewalFinalAmount) {
                      setRenewalAmountPaid(renewalFinalAmount);
                    }
                    if (next === "NOT_DONE") {
                      setRenewalAmountPaid("");
                    }
                  }}
                  className="flex h-12 w-full rounded-xl border-0 bg-[#27272a] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff00]"
                >
                  <option value="NOT_DONE">Not done</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {renewalPaymentStatus !== "NOT_DONE" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="renewalAmountPaid"
                      className="ml-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400"
                    >
                      Amount paid
                    </label>
                    <input
                      id="renewalAmountPaid"
                      inputMode="decimal"
                      value={renewalAmountPaid}
                      readOnly={renewalPaymentStatus === "DONE"}
                      onChange={(e) =>
                        setRenewalAmountPaid(
                          e.target.value.replace(/[^\d.]/g, ""),
                        )
                      }
                      placeholder={renewalFinalAmount ?? "0"}
                      className="flex h-12 w-full rounded-xl border-0 bg-[#27272a] px-3 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff00]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      UPI proof
                    </label>
                    <input
                      ref={renewalUpiInputRef}
                      type="file"
                      accept={IMAGE_ACCEPT}
                      className="sr-only"
                      onChange={onRenewalUpiChange}
                    />
                    <button
                      type="button"
                      onClick={() => renewalUpiInputRef.current?.click()}
                      className={`flex h-12 w-full items-center justify-center rounded-xl border-2 border-dashed text-xs font-bold uppercase tracking-wider ${
                        renewalUpiFile
                          ? "border-[#d4ff00] bg-[#d4ff00]/5 text-[#d4ff00]"
                          : "border-zinc-700 bg-[#27272a] text-zinc-400"
                      }`}
                    >
                      {renewalUpiFile ? "Selected" : "Upload"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl bg-[#101010] p-3 text-xs text-zinc-400">
                Final amount:{" "}
                <span className="font-bold text-white">
                  {renewalFinalAmount
                    ? formatInrFromDecimalString(renewalFinalAmount)
                    : "Set pricing"}
                </span>
              </div>

              <button
                type="button"
                onClick={renewMembership}
                disabled={renewing || !renewalPrice}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#d4ff00] text-xs font-extrabold uppercase tracking-widest text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {renewing ? "Renewing..." : "Renew membership"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Clear Dues Confirmation Dialog */}
      {clearDuesDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[1.5rem] bg-[#16161a] p-6 text-white shadow-2xl">
            <h2 className="mb-4 text-xl font-bold">Clear Dues</h2>
            <p className="mb-6 text-sm text-gray-300">
              Are you sure you want to clear dues for{" "}
              <span className="font-semibold text-white">
                ₹{formatInrFromDecimalString(clearDuesDialog.planPrice)}
              </span>
              ? This will mark the payment as complete.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setClearDuesDialog({ ...clearDuesDialog, isOpen: false })}
                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-white/10 bg-zinc-800 text-sm font-bold transition-colors hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearDues}
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#d4ff00] text-sm font-bold text-black transition-colors hover:bg-[#bce600]"
              >
                Clear Dues
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
