"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Member = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  billingDuration: string;
  planPrice: string;
  startDate: string;
  endDate: string;
  membershipStatus: string;
};

const DURATION_LABELS: Record<string, string> = {
  ONE_MONTH: "1 Month",
  THREE_MONTHS: "3 Months",
  SIX_MONTHS: "6 Months",
  TWELVE_MONTHS: "12 Months",
};

export function SuperAdminMembersTable({
  ownerId,
  initialMembers,
}: {
  ownerId: string;
  initialMembers: Member[];
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(memberId: string, name: string) {
    if (!confirm(`Delete member "${name}"? This cannot be undone.`)) return;
    setDeletingId(memberId);
    try {
      const res = await fetch(
        `/api/superadmin/gym-owners/${ownerId}/members/${memberId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Delete failed");
        return;
      }
      toast.success(`"${name}" removed`);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingId(null);
    }
  }

  function statusBadge(status: string, endDate: string) {
    const expired = new Date(endDate) < new Date();
    if (status === "PAUSED") return <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-400">Paused</span>;
    if (expired) return <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-400">Expired</span>;
    return <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-green-400">Active</span>;
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-zinc-500">
        <Users className="h-10 w-10 opacity-30" />
        <p className="text-sm">No members yet for this gym.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone / Email</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {members.map((m) => (
              <tr key={m.id} className="bg-transparent transition-colors hover:bg-white/5">
                <td className="px-4 py-3 font-medium text-white">{m.fullName}</td>
                <td className="px-4 py-3">
                  <div className="text-zinc-200">{m.phone}</div>
                  {m.email && <div className="text-xs text-zinc-500">{m.email}</div>}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {DURATION_LABELS[m.billingDuration] ?? m.billingDuration}
                </td>
                <td className="px-4 py-3 text-zinc-300">₹{m.planPrice}</td>
                <td className="px-4 py-3 text-zinc-400">
                  {new Date(m.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {new Date(m.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  {statusBadge(m.membershipStatus, m.endDate)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(m.id, m.fullName)}
                    disabled={deletingId === m.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    title="Delete member"
                  >
                    {deletingId === m.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
