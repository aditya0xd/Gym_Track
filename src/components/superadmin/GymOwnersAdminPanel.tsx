"use client";

import { useCallback, useEffect, useState } from "react";
import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";
import { toast } from "sonner";
import Link from "next/link";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";

type GymOwnerRow = {
  id: string;
  name: string;
  email: string;
  subscriptionPlan: OwnerSubscriptionPlan;
  trialEndsAt: string | null;
  memberCount: number;
  createdAt: string;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function GymOwnersAdminPanel() {
  const [rows, setRows] = useState<GymOwnerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/superadmin/gym-owners");
    if (!res.ok) {
      toast.error("Could not load gym owners.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { gymOwners: GymOwnerRow[] };
    setRows(data.gymOwners ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveRow(id: string, plan: OwnerSubscriptionPlan, trialLocal: string) {
    const trialEndsAt = fromDatetimeLocalValue(trialLocal);
    const res = await fetch(`/api/superadmin/gym-owners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptionPlan: plan,
        trialEndsAt,
      }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      toast.error(data.message ?? "Update failed.");
      return;
    }
    toast.success("Gym owner updated.");
    await load();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading gym owners…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Gym / owner</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Members</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Platform plan</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Trial ends</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <GymOwnerEditableRow
                  key={row.id}
                  row={row}
                  onSave={async (plan, trialLocal) => {
                    await saveRow(row.id, plan, trialLocal);
                  }}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-8 text-center text-muted-foreground sm:px-4"
                    colSpan={5}
                  >
                    No gym owners yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GymOwnerEditableRow({
  row,
  onSave,
}: {
  row: GymOwnerRow;
  onSave: (plan: OwnerSubscriptionPlan, trialLocal: string) => void | Promise<void>;
}) {
  const [plan, setPlan] = useState<OwnerSubscriptionPlan>(row.subscriptionPlan);
  const [trialLocal, setTrialLocal] = useState(() =>
    toDatetimeLocalValue(row.trialEndsAt),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPlan(row.subscriptionPlan);
    setTrialLocal(toDatetimeLocalValue(row.trialEndsAt));
  }, [row.id, row.subscriptionPlan, row.trialEndsAt]);

  async function handleApply() {
    setSaving(true);
    await onSave(plan, trialLocal);
    setSaving(false);
  }

  return (
    <tr className="bg-card">
      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="font-medium text-foreground">{row.name}</div>
        <div className="text-xs text-muted-foreground">{row.email}</div>
      </td>
      <td className="px-3 py-2.5 text-foreground sm:px-4 sm:py-3">
        {row.memberCount}
      </td>
      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as OwnerSubscriptionPlan)}
          className="w-full max-w-[140px] min-h-10 rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground shadow-sm sm:min-h-0 sm:py-1.5"
        >
          {OWNER_SUBSCRIPTION_PLAN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
        <input
          type="datetime-local"
          value={trialLocal}
          onChange={(e) => setTrialLocal(e.target.value)}
          className="min-h-10 w-full min-w-[200px] rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground shadow-sm sm:min-h-0 sm:py-1.5"
        />
      </td>
      <td className="px-3 py-2.5 text-right sm:px-4 sm:py-3 flex items-center justify-end gap-2">
        <Link
          href={`/superadmin/gym-owners/${row.id}/members`}
          className="flex h-9 items-center gap-1.5 rounded-md bg-white/5 px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          title="Manage Members"
        >
          <Users className="h-3.5 w-3.5" />
          Members
        </Link>
        <Button type="button" size="sm" disabled={saving} onClick={handleApply}>
          {saving ? "Saving…" : "Apply"}
        </Button>
      </td>
    </tr>
  );
}
