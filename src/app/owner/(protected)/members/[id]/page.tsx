import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { MemberMembershipActions } from "@/components/gym-owner/MemberMembershipActions";
import { MemberNotificationActions } from "@/components/gym-owner/MemberNotificationActions";
import { authOptions } from "@/lib/auth";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import { getMemberForOwner } from "@/server/gym-owner/member.service";

export const metadata = {
  title: "Member details | Gym owner",
};

function durationLabel(value: string) {
  return MEMBER_BILLING_DURATION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function daysLeftText(endDate: Date) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Expired ${Math.abs(diff)}d ago`;
  return `${diff} days`;
}

export default async function OwnerMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  const { id } = await params;
  const member = await getMemberForOwner(session.user.id, id);
  if (!member) {
    notFound();
  }
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in7Days = new Date(today);
  in7Days.setUTCDate(in7Days.getUTCDate() + 7);
  const status =
    member.membershipStatus === "PAUSED"
      ? "Paused"
      : member.endDate < today
        ? "Expired"
        : member.endDate <= in7Days
          ? "Expiring soon"
          : "Active";
  const canPause =
    member.membershipStatus === "ACTIVE" && member.endDate >= today;

  return (
    <PageShell>
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <Link href="/owner/dashboard" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Back to members
          </Link>
          <div className="mt-3 flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-lg font-bold text-background">
              {member.fullName[0]?.toUpperCase() ?? "M"}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
                {member.fullName}
              </h1>
              <span className="mt-2 inline-block rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground">
                {status}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {[
            ["Phone", member.phone],
            ["Email", member.email ?? "Not provided"],
            ["Plan", durationLabel(member.billingDuration)],
            [
              "Amount charged",
              formatInrFromDecimalString(member.planPrice.toString()),
            ],
            [
              "Discount from list price",
              Number(member.discountInr) > 0
                ? formatInrFromDecimalString(member.discountInr.toString())
                : "—",
            ],
            ["Start date", member.startDate.toISOString().slice(0, 10)],
            ["End date", member.endDate.toISOString().slice(0, 10)],
            ["Days left", daysLeftText(member.endDate)],
            [
              "Membership",
              member.membershipStatus === "PAUSED" ? "Paused / frozen" : "Active",
            ],
            [
              "Paused since",
              member.pausedAt ? member.pausedAt.toISOString().slice(0, 10) : "—",
            ],
            ["WhatsApp", member.whatsappEnabled ? "Enabled" : "Disabled"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
              <p className="text-sm font-medium text-foreground">{v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button type="button" variant="outline" disabled>
            Edit
          </Button>
          <div className="space-y-3 sm:col-span-2">
            <MemberMembershipActions
              memberId={member.id}
              membershipStatus={member.membershipStatus}
              canPause={canPause}
            />
            <MemberNotificationActions memberId={member.id} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Reminder log</p>
          <div className="mt-3 space-y-3">
            {member.reminders.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <p className="text-muted-foreground">
                    {r.channel} · {r.sentAt.toISOString().slice(0, 10)}
                  </p>
                  <span className="text-foreground">{r.status}</span>
                </div>
                <p className="mt-1 text-sm text-foreground">{r.message}</p>
              </div>
            ))}
            {member.reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reminders sent yet.</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Member photo</p>
            <div className="mt-3">
              {member.memberPhoto ? (
                <img
                  src={member.memberPhoto}
                  alt={`${member.fullName} photo`}
                  className="aspect-square w-full rounded-lg border border-border object-cover"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No photo uploaded.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              UPI payment screenshot
            </p>
            <div className="mt-3">
              {member.upiScreenshot ? (
                <img
                  src={member.upiScreenshot}
                  alt={`UPI screenshot for ${member.fullName}`}
                  className="max-h-[420px] w-full rounded-lg border border-border object-contain"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No UPI screenshot uploaded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
