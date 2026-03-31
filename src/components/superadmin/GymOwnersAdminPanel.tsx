"use client";

import { useCallback, useEffect, useState } from "react";
import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";

import { Button } from "@/components/ui/button";
import {
  OWNER_SUBSCRIPTION_PLAN_OPTIONS,
} from "@/lib/constants/billing";

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
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/superadmin/gym-owners");
    if (!res.ok) {
      setError("Could not load gym owners.");
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
    setSavingId(id);
    setError(null);
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
      setError(data.message ?? "Update failed.");
      setSavingId(null);
      return;
    }
    await load();
    setSavingId(null);
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading gym owners…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-violet-500/20 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-950/70 text-left text-slate-300">
              <tr>
                <th className="px-4 py-3">Gym / owner</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Platform plan</th>
                <th className="px-4 py-3">Trial ends</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-500/10 text-slate-100">
              {rows.map((row) => (
                <GymOwnerEditableRow
                  key={row.id}
                  row={row}
                  saving={savingId === row.id}
                  onSave={(plan, trialLocal) => saveRow(row.id, plan, trialLocal)}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
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
  saving,
  onSave,
}: {
  row: GymOwnerRow;
  saving: boolean;
  onSave: (plan: OwnerSubscriptionPlan, trialLocal: string) => void;
}) {
  const [plan, setPlan] = useState<OwnerSubscriptionPlan>(row.subscriptionPlan);
  const [trialLocal, setTrialLocal] = useState(() =>
    toDatetimeLocalValue(row.trialEndsAt),
  );

  useEffect(() => {
    setPlan(row.subscriptionPlan);
    setTrialLocal(toDatetimeLocalValue(row.trialEndsAt));
  }, [row.id, row.subscriptionPlan, row.trialEndsAt]);

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-medium">{row.name}</div>
        <div className="text-xs text-slate-400">{row.email}</div>
      </td>
      <td className="px-4 py-3">{row.memberCount}</td>
      <td className="px-4 py-3">
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as OwnerSubscriptionPlan)}
          className="w-full max-w-[140px] rounded-md border border-white/15 bg-slate-950 px-2 py-1.5 text-slate-100"
        >
          {OWNER_SUBSCRIPTION_PLAN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="datetime-local"
          value={trialLocal}
          onChange={(e) => setTrialLocal(e.target.value)}
          className="w-full min-w-[200px] rounded-md border border-white/15 bg-slate-950 px-2 py-1.5 text-slate-100"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => onSave(plan, trialLocal)}
        >
          {saving ? "Saving…" : "Apply"}
        </Button>
      </td>
    </tr>
  );
}
