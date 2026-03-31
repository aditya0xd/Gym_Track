"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { BillingStatus, OwnerSubscriptionPlan } from "@/generated/prisma/client";
import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import { Button } from "@/components/ui/button";

type ManagePlanData = {
  currentPlan: OwnerSubscriptionPlan;
  trialEndsAt: string | null;
  planPrices: Record<OwnerSubscriptionPlan, string>;
  invoices: {
    id: string;
    plan: OwnerSubscriptionPlan;
    amountInr: string;
    status: BillingStatus;
    dueDate: string;
    paidAt: string | null;
    createdAt: string;
  }[];
};

export function ManagePlanPanel() {
  const [data, setData] = useState<ManagePlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<OwnerSubscriptionPlan>("TRIAL");
  const [savingPlan, setSavingPlan] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/owner/manage-plan");
    const json = (await res.json()) as ManagePlanData | { message?: string };
    if (!res.ok) {
      toast.error((json as { message?: string }).message ?? "Could not load billing info.");
      setLoading(false);
      return;
    }
    const payload = json as ManagePlanData;
    setData(payload);
    setSelectedPlan(payload.currentPlan);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPlanPrice = useMemo(() => {
    if (!data) return "0.00";
    return data.planPrices[selectedPlan];
  }, [data, selectedPlan]);

  async function handleChangePlan() {
    if (!data) return;
    setSavingPlan(true);
    const res = await fetch("/api/owner/manage-plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionPlan: selectedPlan }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      toast.error(json.message ?? "Could not change plan.");
      setSavingPlan(false);
      return;
    }
    toast.success(json.message ?? "Plan updated.");
    setSavingPlan(false);
    await load();
  }

  async function handlePayNow(invoiceId: string) {
    setPayingId(invoiceId);
    const res = await fetch(`/api/owner/billing/${invoiceId}/pay`, { method: "POST" });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      toast.error(json.message ?? "Payment failed.");
      setPayingId(null);
      return;
    }
    toast.success("Payment marked as successful.");
    setPayingId(null);
    await load();
  }

  if (loading || !data) {
    return <p className="text-sm text-muted-foreground">Loading plan and billing details…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Manage plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upgrade or downgrade your gym owner plan. A new invoice is generated on plan change.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Current plan</p>
            <p className="text-sm font-semibold text-foreground">{data.currentPlan}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Trial ends: {data.trialEndsAt ? data.trialEndsAt.slice(0, 10) : "N/A"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Selected plan price</p>
            <p className="text-sm font-semibold text-foreground">
              {formatInrFromDecimalString(selectedPlanPrice)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-[220px]">
            <label htmlFor="ownerPlan" className="mb-1 block text-sm text-muted-foreground">
              Plan
            </label>
            <select
              id="ownerPlan"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value as OwnerSubscriptionPlan)}
              className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {OWNER_SUBSCRIPTION_PLAN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} ({formatInrFromDecimalString(data.planPrices[o.value])})
                </option>
              ))}
            </select>
          </div>
          <Button type="button" disabled={savingPlan} onClick={handleChangePlan}>
            {savingPlan ? "Updating…" : "Update plan"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Date</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Plan</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Amount</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Status</th>
                <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Due</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.invoices.map((inv) => (
                <tr key={inv.id} className="bg-card">
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                    {inv.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">{inv.plan}</td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                    {formatInrFromDecimalString(inv.amountInr)}
                  </td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">{inv.status}</td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3">{inv.dueDate}</td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">
                    {inv.status === "PENDING" ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={payingId === inv.id}
                        onClick={() => handlePayNow(inv.id)}
                      >
                        {payingId === inv.id ? "Paying…" : "Pay now"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {inv.status === "PAID" ? "Paid" : "No action"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {data.invoices.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-8 text-center text-muted-foreground sm:px-4"
                    colSpan={6}
                  >
                    No billing invoices yet.
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
