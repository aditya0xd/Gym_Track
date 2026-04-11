"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";
import {
  PLAN_FEATURE_KEYS,
  PLAN_FEATURE_LABELS,
  defaultPlanFeatureMatrix,
} from "@/lib/constants/plan-features";
import type { OwnerSubscriptionPlan, PlanFeatureKey } from "@/generated/prisma/client";

type Matrix = Record<OwnerSubscriptionPlan, Record<PlanFeatureKey, boolean>>;

export function PlanFeaturesAdminPanel() {
  const [matrix, setMatrix] = useState<Matrix>(() => defaultPlanFeatureMatrix());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/superadmin/plan-features");
    const data = (await res.json()) as { features?: Matrix; message?: string };
    if (!res.ok || !data.features) {
      toast.error(data.message ?? "Could not load plan features.");
      setLoading(false);
      return;
    }
    setMatrix(data.features);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setCell(plan: OwnerSubscriptionPlan, key: PlanFeatureKey, enabled: boolean) {
    setMatrix((prev) => ({
      ...prev,
      [plan]: { ...prev[plan], [key]: enabled },
    }));
  }

  async function onSave() {
    setSaving(true);
    const res = await fetch("/api/superadmin/plan-features", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(matrix),
    });
    const data = (await res.json()) as { message?: string; features?: Matrix };
    if (!res.ok || !data.features) {
      toast.error(data.message ?? "Could not save plan features.");
      setSaving(false);
      return;
    }
    setMatrix(data.features);
    toast.success("Plan features updated.");
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading plan features…</p>;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-base font-semibold text-foreground">Plan features</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Control which product capabilities each subscription tier includes. Empty database
        entries use built-in defaults until you save.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-3 font-medium text-muted-foreground">Capability</th>
              {OWNER_SUBSCRIPTION_PLAN_OPTIONS.map(({ value, label }) => (
                <th key={value} className="px-2 py-2 font-medium text-foreground">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURE_KEYS.map((key) => (
              <tr key={key} className="border-b border-border/80">
                <td className="py-2 pr-3 text-foreground">{PLAN_FEATURE_LABELS[key]}</td>
                {OWNER_SUBSCRIPTION_PLAN_OPTIONS.map(({ value: plan }) => (
                  <td key={plan} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={matrix[plan][key]}
                      onChange={(e) => setCell(plan, key, e.target.checked)}
                      aria-label={`${PLAN_FEATURE_LABELS[key]} for ${plan}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save features"}
        </Button>
      </div>
    </div>
  );
}
