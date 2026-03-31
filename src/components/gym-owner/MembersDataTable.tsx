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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-950/60 text-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">Member</th>
              <th className="px-4 py-3 text-left">Duration</th>
              <th className="px-4 py-3 text-left">Price (INR)</th>
              <th className="px-4 py-3 text-left">Start</th>
              <th className="px-4 py-3 text-left">End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-slate-900/20 text-slate-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{m.fullName}</div>
                  {m.email ? (
                    <div className="text-xs text-slate-300">{m.email}</div>
                  ) : (
                    <div className="text-xs text-slate-500">No email</div>
                  )}
                  <div className="text-xs text-slate-500">{m.phone}</div>
                </td>
                <td className="px-4 py-3">
                  {durationLabel(m.billingDuration)}{" "}
                  <span className="text-xs text-slate-400">
                    ({m.whatsappEnabled ? "WhatsApp" : "SMS"})
                  </span>
                </td>
                <td className="px-4 py-3">{formatInrFromDecimalString(m.planPrice)}</td>
                <td className="px-4 py-3">{m.startDate}</td>
                <td className="px-4 py-3">{m.endDate}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-slate-400" colSpan={5}>
                  No members yet. Enroll someone under{" "}
                  <span className="text-slate-300">Enroll member</span>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
