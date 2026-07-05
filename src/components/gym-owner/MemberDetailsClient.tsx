"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, User, Phone, Mail, MessageCircle, Camera, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import type { MemberBillingDuration, MembershipStatus } from "@/generated/prisma/client";

interface ReminderItem {
  id: string;
  channel: string;
  sentAt: string;
  status: string;
  message: string;
}

interface MemberDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  billingDuration: MemberBillingDuration;
  planPrice: string;
  discountInr: string;
  startDate: string;
  endDate: string;
  membershipStatus: MembershipStatus;
  pausedAt: string | null;
  whatsappEnabled: boolean;
  memberPhoto: string | null;
  upiScreenshot: string | null;
  reminders: ReminderItem[];
}

function durationLabel(value: string) {
  return MEMBER_BILLING_DURATION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function daysLeft(endDateStr: string) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endDate = new Date(endDateStr);
  return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function totalDays(startDateStr: string, endDateStr: string) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/** SVG arc gauge showing days remaining */
function DaysArc({ remaining, total }: { remaining: number; total: number }) {
  const clampedRemaining = Math.max(0, remaining);
  const clampedTotal = Math.max(1, total);
  const fraction = Math.min(1, clampedRemaining / clampedTotal);

  const cx = 60, cy = 65, r = 44;
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

  const endDateObj = new Date(new Date().setDate(new Date().getDate() + clampedRemaining));
  const endLabel = endDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col items-center mt-1">
      <svg width="120" height="80" viewBox="0 0 120 95" className="overflow-visible">
        {/* Track */}
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`}
          fill="none" stroke="#2a2a2a" strokeWidth="7" strokeLinecap="round"
        />
        {/* Progress */}
        {fraction > 0 && (
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${progressEnd.x} ${progressEnd.y}`}
            fill="none" stroke="#d4ff00" strokeWidth="7" strokeLinecap="round"
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
  const { data: member, isLoading, error, refetch } = useQuery({
    queryKey: ["member", id],
    queryFn: () => fetchMember(id),
  });
  const [sendingType, setSendingType] = useState<"MEMBERSHIP_EXPIRY" | "PAYMENT_DUE" | null>(null);
  const [pauseLoading, setPauseLoading] = useState(false);

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
        <p className="text-sm font-semibold text-red-400">Failed to load member details</p>
        <p className="text-xs text-gray-500">{(error as Error)?.message || "Member not found"}</p>
      </div>
    );
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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
      const res = await fetch(`/api/owner/members/${member!.id}/membership-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) { toast.error(data.message ?? "Could not update membership."); return; }
      toast.success(data.message ?? "Updated.");
      refetch();
      router.refresh();
    } catch { toast.error("Network error. Please try again."); }
    finally { setPauseLoading(false); }
  }

  async function sendReminder(reminderType: "MEMBERSHIP_EXPIRY" | "PAYMENT_DUE") {
    setSendingType(reminderType);
    try {
      const res = await fetch(`/api/owner/members/${member!.id}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderType }),
      });
      const data = (await res.json()) as { message?: string; reminder?: { channel?: string; reminderType?: string } };
      if (!res.ok) { toast.error(data.message ?? "Could not send reminder."); return; }
      const kind = reminderType === "PAYMENT_DUE" ? "payment due" : "membership expiry";
      toast.success(`Sent ${kind} reminder via ${data.reminder?.channel ?? "channel"}.`);
      refetch();
    } catch { toast.error("Network error. Please try again."); }
    finally { setSendingType(null); }
  }

  const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    Active: { bg: "bg-[#0d2e12]", text: "text-[#4ade80]", dot: "bg-[#4ade80]" },
    "Expiring Soon": { bg: "bg-[#3d2e00]", text: "text-yellow-400", dot: "bg-yellow-400" },
    Paused: { bg: "bg-[#1a2a3d]", text: "text-blue-400", dot: "bg-blue-400" },
    Expired: { bg: "bg-[#3d1a1a]", text: "text-red-400", dot: "bg-red-400" },
  };
  const sc = statusStyles[status] ?? statusStyles["Active"];

  const planLabel = durationLabel(member.billingDuration);
  const planPrice = formatInrFromDecimalString(member.planPrice);

  return (
    <>
      {/* Page title */}
      <div className="mb-4 pt-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4ff00]">Member</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">{member.fullName}</h1>
      </div>

      <div className="space-y-3 pb-24">

        {/* ── Header Card: Avatar + Name + Status + Actions ── */}
        <div className="rounded-2xl bg-[#1c1c1c] p-4">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#2a2a2a]">
              {member.memberPhoto ? (
                <img src={member.memberPhoto} alt={member.fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#2a2a2a]">
                  <User className="h-7 w-7 text-gray-500" />
                </div>
              )}
            </div>
            <div>
              <p className="text-base font-bold text-white">{member.fullName}</p>
              <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sc.bg} ${sc.text}`}>
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
              onClick={() => applyMembership(member.membershipStatus === "PAUSED" ? "resume" : "pause")}
              disabled={(!canPause && member.membershipStatus !== "PAUSED") || pauseLoading}
              className="flex flex-1 items-center justify-center rounded-full bg-[#d4ff00] py-2.5 text-xs font-extrabold uppercase tracking-wider text-black transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-40"
            >
              {pauseLoading ? "…" : member.membershipStatus === "PAUSED" ? "Resume" : "Pause/Freeze"}
            </button>
            <button
              id="member-logs-btn"
              onClick={() => sendReminder("MEMBERSHIP_EXPIRY")}
              disabled={sendingType !== null}
              className="flex flex-1 items-center justify-center rounded-full bg-[#d4ff00] py-2.5 text-xs font-extrabold uppercase tracking-wider text-black transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-40"
            >
              {sendingType === "MEMBERSHIP_EXPIRY" ? "…" : "Logs"}
            </button>
          </div>
        </div>

        {/* ── Plan + Days Left card ── */}
        <div className="rounded-2xl bg-[#1c1c1c] overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-[#2a2a2a]">
            {/* Plan */}
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Plan</p>
              <p className="mt-1 text-sm font-extrabold text-white leading-snug">
                {planLabel}
                <span className="block text-sm font-semibold text-gray-300">({planPrice})</span>
              </p>
              <div className="mt-4 space-y-1">
                <p className="text-[11px] text-gray-400">
                  Starts: <span className="text-gray-200">{member.startDate.slice(0, 10)}</span>
                </p>
                <p className="text-[11px] text-gray-400">
                  Ends: <span className="text-gray-200">{member.endDate.slice(0, 10)}</span>
                </p>
              </div>
            </div>

            {/* Days left */}
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Days Left</p>
              <p className="mt-0.5 text-sm font-extrabold text-white">
                {remaining > 0 ? `${remaining} Days Remaining` : remaining === 0 ? "Ends today" : "Expired"}
              </p>
              <DaysArc remaining={remaining} total={total} />
            </div>
          </div>
        </div>

        {/* ── Information card ── */}
        <div className="rounded-2xl bg-[#1c1c1c] p-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-white">Information</p>
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

        {/* ── Member Logs card ── */}
        <div className="rounded-2xl bg-[#1c1c1c] p-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-white">Member Logs</p>
          {member.reminders.length === 0 ? (
            <p className="text-sm text-gray-500">No reminders sent yet.</p>
          ) : (
            <div className="space-y-3">
              {member.reminders.map((r) => (
                <div key={r.id}>
                  <p className="text-xs text-gray-400">
                    {r.channel} · {r.sentAt.slice(0, 10)}{" "}
                    <span className="rounded bg-[#2a2a2a] px-1.5 py-0.5 text-[10px] uppercase text-gray-300">
                      {r.status}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-white">{r.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Quick send buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              id="send-expiry-reminder-btn"
              onClick={() => sendReminder("MEMBERSHIP_EXPIRY")}
              disabled={sendingType !== null}
              className="rounded-full border border-[#d4ff00]/40 px-3 py-1 text-xs font-semibold text-[#d4ff00] transition-colors hover:bg-[#d4ff00]/10 disabled:opacity-40"
            >
              {sendingType === "MEMBERSHIP_EXPIRY" ? "Sending…" : "Send expiry reminder"}
            </button>
            <button
              id="send-payment-reminder-btn"
              onClick={() => sendReminder("PAYMENT_DUE")}
              disabled={sendingType !== null}
              className="rounded-full border border-[#d4ff00]/40 px-3 py-1 text-xs font-semibold text-[#d4ff00] transition-colors hover:bg-[#d4ff00]/10 disabled:opacity-40"
            >
              {sendingType === "PAYMENT_DUE" ? "Sending…" : "Send payment reminder"}
            </button>
          </div>
        </div>

        {/* ── Upload Documents card ── */}
        <div className="rounded-2xl bg-[#1c1c1c] p-4">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-white">Upload Documents</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Member Photo */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Member Photo</p>
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
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">UPI Payment Screenshot</p>
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
    </>
  );
}
