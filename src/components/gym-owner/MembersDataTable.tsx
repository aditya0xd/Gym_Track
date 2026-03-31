import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import type { MemberBillingDuration } from "@/generated/prisma/client";

export type MemberRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  billingDuration: MemberBillingDuration;
  planPrice: string;
  startDate: string;
  endDate: string;
  whatsappEnabled: boolean;
};

function durationLabel(d: MemberBillingDuration) {
  return (
    MEMBER_BILLING_DURATION_OPTIONS.find((o) => o.value === d)?.label ?? d
  );
}

export function MembersDataTable({ members }: { members: MemberRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Member</th>
              <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Duration</th>
              <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Price (INR)</th>
              <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Start</th>
              <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((m) => (
              <tr key={m.id} className="bg-card">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{m.fullName}</div>
                  {m.email ? (
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  ) : (
                    <div className="text-xs text-muted-foreground/80">No email</div>
                  )}
                  <div className="text-xs text-muted-foreground">{m.phone}</div>
                </td>
                <td className="px-3 py-2.5 text-foreground sm:px-4 sm:py-3">
                  {durationLabel(m.billingDuration)}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({m.whatsappEnabled ? "WhatsApp" : "SMS"})
                  </span>
                </td>
                <td className="px-3 py-2.5 text-foreground sm:px-4 sm:py-3">
                  {formatInrFromDecimalString(m.planPrice)}
                </td>
                <td className="px-3 py-2.5 text-foreground sm:px-4 sm:py-3">
                  {m.startDate}
                </td>
                <td className="px-3 py-2.5 text-foreground sm:px-4 sm:py-3">
                  {m.endDate}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td
                  className="px-3 py-10 text-center text-muted-foreground sm:px-4"
                  colSpan={5}
                >
                  No members yet. Enroll someone under{" "}
                  <span className="font-medium text-foreground">Enroll member</span>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
