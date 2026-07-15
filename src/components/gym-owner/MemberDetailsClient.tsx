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
import {
  durationLabel,
  priceForDuration,
  pricedDurations,
  type MembershipPlanDto,
} from "@/lib/membership-plans/client";
import {
  IMAGE_ACCEPT,
  IMAGE_PROCESSING_PRESETS,
} from "@/lib/image-processing/config";
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
  membershipPlanName: string | null;
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
  membershipPlanId: string | null;
  membershipPlanName: string | null;
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
    return "bg-green-100 dark:bg-[#0d2e12] text-green-600 dark:text-[#4ade80]";
  }
  if (status === "PARTIAL") {
    return "bg-yellow-100 dark:bg-[#3d2e00] text-yellow-600 dark:text-yellow-400";
  }
  return "bg-red-100 dark:bg-[#3d1a1a] text-red-600 dark:text-red-400";
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
          className="stroke-muted"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Progress */}
        {fraction > 0 && (
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${progressEnd.x} ${progressEnd.y}`}
            fill="none"
            className="stroke-primary"
            strokeWidth="7"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="flex w-full justify-between px-1 -mt-1 text-[10px] text-muted-foreground">
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
  const [plans, setPlans] = useState<MembershipPlanDto[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
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
      const res = await fetch("/api/owner/membership-plans");
      if (!res.ok) return;
      const data = (await res.json()) as { plans: MembershipPlanDto[] };
      const loaded = data.plans ?? [];
      if (!cancelled) {
        setPlans(loaded);
        const currentPlanExists = member ? loaded.some((p) => p.id === member.membershipPlanId) : false;
        if (currentPlanExists && member) {
          setSelectedPlanId(member.membershipPlanId);
        } else if (loaded[0]) {
          setSelectedPlanId(loaded[0].id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [member?.membershipPlanId]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const availableDurations = useMemo(
    () => (selectedPlan ? pricedDurations(selectedPlan) : []),
    [selectedPlan],
  );

  useEffect(() => {
    if (!selectedPlan) return;
    const hasCurrent = availableDurations.some((d) => d.duration === renewalDuration);
    if (!hasCurrent && availableDurations[0]) {
      setRenewalDuration(availableDurations[0].duration);
    }
  }, [selectedPlan, availableDurations, renewalDuration]);

  const renewalPrice = useMemo(() => {
    if (!selectedPlan) return null;
    return priceForDuration(selectedPlan, renewalDuration);
  }, [selectedPlan, renewalDuration]);

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading member details…</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-semibold text-destructive">
          Failed to load member details
        </p>
        <p className="text-xs text-muted-foreground">
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
    Active: { bg: "bg-green-100 dark:bg-[#0d2e12]", text: "text-green-600 dark:text-[#4ade80]", dot: "bg-green-500 dark:bg-[#4ade80]" },
    "Expiring Soon": {
      bg: "bg-yellow-100 dark:bg-[#3d2e00]",
      text: "text-yellow-600 dark:text-yellow-400",
      dot: "bg-yellow-500 dark:bg-yellow-400",
    },
    Paused: { bg: "bg-blue-100 dark:bg-[#1a2a3d]", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500 dark:bg-blue-400" },
    Expired: { bg: "bg-red-100 dark:bg-[#3d1a1a]", text: "text-red-600 dark:text-red-400", dot: "bg-red-500 dark:bg-red-400" },
  };
  const sc = statusStyles[status] ?? statusStyles["Active"];

  const planLabel = member.membershipPlanName
    ? `${member.membershipPlanName} · ${durationLabel(member.billingDuration)}`
    : durationLabel(member.billingDuration);
  const planPrice = formatInrFromDecimalString(member.planPrice);
  const amountPaid = formatInrFromDecimalString(member.amountPaid);
  const balanceDue = formatInrFromDecimalString(
    Math.max(0, Number(member.planPrice) - Number(member.amountPaid)).toFixed(
      2,
    ),
  );
  async function renewMembership() {
    if (!member) return;
    if (status !== "Expired") {
      toast.error("Only expired memberships can be renewed from here.");
      return;
    }
    if (!selectedPlanId) {
      toast.error("Select a membership plan.");
      return;
    }
    if (!renewalPrice) {
      toast.error(
        "Set this duration's INR price under Pricing before renewing.",
      );
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
          membershipPlanId: selectedPlanId,
          billingDuration: renewalDuration,
          periodStart: renewalPeriodStart,
          paymentStatus: renewalPaymentStatus,
          discountInr:
            renewalDiscount.trim() === "" ? undefined : renewalDiscount.trim(),
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
      <div className="flex h-screen flex-col overflow-hidden bg-background px-4 pt-4 text-foreground">
        {/* Page title + header card (fixed, non-scrolling) */}
        <div className="shrink-0 pb-4">
          <div className="mb-4 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Member
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-foreground">
              {member.fullName}
            </h1>
          </div>

          {/* ── Header Card: Avatar + Name + Status + Actions ── */}
          <div className="rounded-2xl bg-card border border-border p-4">
            {/* Avatar row */}
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-border">
                {member.memberPhoto ? (
                  <img
                    src={member.memberPhoto}
                    alt={member.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <User className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
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
            <div className="mt-4 border-t border-border" />

            {/* Action buttons — horizontal full-width row */}
            <div className="mt-4 flex w-full items-center gap-2">
              <Link
                href={`/owner/members/${member.id}/edit`}
                id="member-edit-btn"
                className="flex flex-1 items-center justify-center rounded-full bg-primary py-2.5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 active:scale-95"
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
                className="flex flex-[2] items-center justify-center rounded-full bg-primary py-2.5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-40"
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
                className="flex flex-1 items-center justify-center rounded-full bg-primary py-2.5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-40"
              >
                Renew
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content area below the fixed header */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-24">
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-border">
              {/* Plan */}
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Plan
                </p>
                <p className="mt-1 text-sm font-extrabold text-foreground leading-snug">
                  {planLabel}
                  <span className="block text-sm font-semibold text-muted-foreground">
                    ({planPrice})
                  </span>
                </p>
                <div className="mt-4 space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Paid: <span className="text-foreground">{amountPaid}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Due: <span className="text-foreground">{balanceDue}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Starts:{" "}
                    <span className="text-foreground">
                      {formatDate(member.startDate)}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Ends:{" "}
                    <span className="text-foreground">
                      {formatDate(member.endDate)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Days left */}
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Days Left
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-foreground">
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
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-foreground">
              Information
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground/95">{member.phone}</span>
              </div>
              {member.email && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-foreground/95">{member.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground/95">
                  WhatsApp: {member.whatsappEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Member Logs */}
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-foreground">
              Member Logs
            </p>
            {member.reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reminders sent yet.</p>
            ) : (
              <div className="space-y-3">
                {member.reminders.map((r) => (
                  <div key={r.id}>
                    <p className="text-xs text-muted-foreground">
                      {r.channel} · {formatDate(r.sentAt)}{" "}
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {r.status}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-foreground">{r.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick send buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                id="send-expiry-reminder-btn"
                onClick={() => sendReminder("MEMBERSHIP_EXPIRY")}
                disabled
                className="rounded-full border border-primary/45 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
              >
                {sendingType === "MEMBERSHIP_EXPIRY"
                  ? "Sending…"
                  : "Send expiry reminder"}
              </button>
              <button
                id="send-payment-reminder-btn"
                onClick={() => sendReminder("PAYMENT_DUE")}
                disabled
                className="rounded-full border border-primary/45 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
              >
                {sendingType === "PAYMENT_DUE"
                  ? "Sending…"
                  : "Send payment reminder"}
              </button>
            </div>
          </div>

          {/* Payment History */}
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-foreground">
                Payment History
              </p>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <ReceiptText className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>

            {!member.paymentStatus && member.renewals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {/* Initial payment */}
                {member.paymentStatus && (
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">
                          Initial Membership
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDate(member.startDate)} to{" "}
                          {formatDate(member.endDate)}
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

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <p>
                        Charged:{" "}
                        <span className="font-semibold text-foreground">
                          {formatInrFromDecimalString(member.planPrice)}
                        </span>
                      </p>
                      <p>
                        Paid:{" "}
                        <span className="font-semibold text-foreground">
                          {formatInrFromDecimalString(member.amountPaid)}
                        </span>
                      </p>
                      <p>
                        Due:{" "}
                        <span className="font-semibold text-foreground">
                          {formatInrFromDecimalString(
                            Math.max(
                              0,
                              Number(member.planPrice) -
                                Number(member.amountPaid),
                            ).toFixed(2),
                          )}
                        </span>
                      </p>
                      <p>
                        Provider:{" "}
                        <span className="font-semibold text-foreground">
                          {member.upiScreenshot ? "UPI" : "Manual"}
                        </span>
                      </p>
                    </div>

                    <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Recorded {formatDate(member.createdAt)}
                    </p>

                    {member.paymentStatus !== "DONE" && (
                      <button
                        onClick={() =>
                          handleClearDues("initial", member.planPrice)
                        }
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
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
                      className="rounded-xl border border-border bg-muted/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {payment.membershipPlanName
                              ? `${payment.membershipPlanName} · ${durationLabel(payment.billingDuration)}`
                              : durationLabel(payment.billingDuration)}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatDate(payment.periodStart)} to{" "}
                            {formatDate(payment.periodEnd)}
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

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <p>
                          Charged:{" "}
                          <span className="font-semibold text-foreground">
                            {formatInrFromDecimalString(payment.planPrice)}
                          </span>
                        </p>
                        <p>
                          Paid:{" "}
                          <span className="font-semibold text-foreground">
                            {formatInrFromDecimalString(payment.amountPaid)}
                          </span>
                        </p>
                        <p>
                          Due:{" "}
                          <span className="font-semibold text-foreground">
                            {formatInrFromDecimalString(due)}
                          </span>
                        </p>
                        <p>
                          Provider:{" "}
                          <span className="font-semibold text-foreground">
                            {payment.paymentProvider}
                          </span>
                        </p>
                      </div>

                      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Recorded {formatDate(payment.createdAt)}
                        {payment.paidAt
                          ? ` - Paid ${formatDate(payment.paidAt)}`
                          : ""}
                      </p>

                      {payment.paymentStatus !== "DONE" && (
                        <button
                          onClick={() =>
                            handleClearDues(payment.id, payment.planPrice)
                          }
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
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
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-foreground">
              Upload Documents
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Member Photo */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Member Photo
                </p>
                <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/50 overflow-hidden transition-colors hover:border-primary/40">
                  {member.memberPhoto ? (
                    <img
                      src={member.memberPhoto}
                      alt={`${member.fullName} photo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <Camera className="h-7 w-7 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add Photo</span>
                    </>
                  )}
                </div>
              </div>

              {/* UPI Screenshot */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  UPI Payment
                </p>
                <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/50 overflow-hidden transition-colors hover:border-primary/40">
                  {member.upiScreenshot ? (
                    <img
                      src={member.upiScreenshot}
                      alt={`UPI screenshot for ${member.fullName}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <>
                      <Upload className="h-7 w-7 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {renewalOpen ? (
          <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 sm:items-center sm:justify-center sm:p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-card border border-border p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Renewal
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-foreground">
                    Renew {member.fullName}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRenewalOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Plan
                  </label>
                  <select
                    value={selectedPlanId ?? ""}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.category ? `(${p.category})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Duration
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableDurations.map(({ duration: d, priceInr }) => {
                      const selected = renewalDuration === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setRenewalDuration(d)}
                          className={`rounded-xl border-2 p-3 text-left transition-colors ${
                            selected
                              ? "border-primary bg-primary/10"
                              : "border-transparent bg-muted hover:bg-muted/80"
                          }`}
                        >
                          <span className="block text-xs font-bold text-foreground">
                            {durationLabel(d)}
                          </span>
                          <span className="mt-1 block text-sm font-black text-primary">
                            {priceInr
                              ? formatInrFromDecimalString(priceInr)
                              : "No price"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedPlan && availableDurations.length === 0 && (
                    <p className="text-xs font-medium text-destructive">
                      This plan has no pricing configured. Add pricing first.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="renewalStart"
                      className="ml-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Start date
                    </label>
                    <input
                      id="renewalStart"
                      type="date"
                      value={renewalPeriodStart}
                      onChange={(e) => setRenewalPeriodStart(e.target.value)}
                      className="flex h-12 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="renewalDiscount"
                      className="ml-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
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
                      className="flex h-12 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="renewalPaymentStatus"
                    className="ml-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
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
                    className="flex h-12 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
                        className="ml-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
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
                        className="flex h-12 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                        className={`flex h-12 w-full items-center justify-center rounded-xl border-2 border-dashed text-xs font-bold uppercase tracking-wider transition-colors ${
                          renewalUpiFile
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {renewalUpiFile ? "Selected" : "Upload"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-xl bg-muted border border-border p-3 text-xs text-muted-foreground">
                  Final amount:{" "}
                  <span className="font-bold text-foreground">
                    {renewalFinalAmount
                      ? formatInrFromDecimalString(renewalFinalAmount)
                      : "Set pricing"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={renewMembership}
                  disabled={renewing || !renewalPrice}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-xs font-extrabold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
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
            <div className="relative w-full max-w-sm overflow-hidden rounded-[1.5rem] bg-card border border-border p-6 text-foreground shadow-2xl">
              <h2 className="mb-4 text-xl font-bold text-foreground">Clear Dues</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Are you sure you want to clear dues for{" "}
                <span className="font-semibold text-foreground">
                  ₹{formatInrFromDecimalString(clearDuesDialog.planPrice)}
                </span>
                ? This will mark the payment as complete.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setClearDuesDialog({ ...clearDuesDialog, isOpen: false })
                  }
                  className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-secondary text-sm font-bold transition-colors hover:bg-muted text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearDues}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/80"
                >
                  Clear Dues
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
