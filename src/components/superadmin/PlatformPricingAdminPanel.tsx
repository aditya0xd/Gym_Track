"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type PlanPrices = {
  TRIAL: string;
  STARTER: string;
  PRO: string;
};

export function PlatformPricingAdminPanel() {
  const [prices, setPrices] = useState<PlanPrices>({
    TRIAL: "0.00",
    STARTER: "1499.00",
    PRO: "2999.00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/superadmin/platform-pricing");
    const data = (await res.json()) as { prices?: PlanPrices; message?: string };
    if (!res.ok || !data.prices) {
      toast.error(data.message ?? "Could not load platform pricing.");
      setLoading(false);
      return;
    }
    setPrices(data.prices);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave() {
    setSaving(true);
    const res = await fetch("/api/superadmin/platform-pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prices),
    });
    const data = (await res.json()) as { message?: string; prices?: PlanPrices };
    if (!res.ok || !data.prices) {
      toast.error(data.message ?? "Could not save prices.");
      setSaving(false);
      return;
    }
    setPrices(data.prices);
    toast.success("Platform plan prices updated.");
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading platform pricing…</p>;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-base font-semibold text-foreground">Platform plan pricing</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure fallback monthly price per gym-owner subscription plan.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(["TRIAL", "STARTER", "PRO"] as const).map((plan) => (
          <label key={plan} className="space-y-1">
            <span className="text-sm text-muted-foreground">{plan} (INR)</span>
            <input
              type="text"
              value={prices[plan]}
              onChange={(e) =>
                setPrices((prev) => ({
                  ...prev,
                  [plan]: e.target.value.replace(/[^\d.]/g, ""),
                }))
              }
              className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
        ))}
      </div>
      <div className="mt-4">
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save prices"}
        </Button>
      </div>
    </div>
  );
}
