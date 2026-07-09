"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type PlanPrices = {
  TRIAL: string;
  STARTER: string;
  PRO: string;
};

const DEFAULT_PRICES: PlanPrices = {
  TRIAL: "0.00",
  STARTER: "1499.00",
  PRO: "2999.00",
};

export function PlatformPricingAdminPanel() {
  const queryClient = useQueryClient();
  const [draftPrices, setDraftPrices] = useState<PlanPrices | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: loadedPrices, isLoading } = useQuery({
    queryKey: ["superadmin-platform-pricing"],
    queryFn: async () => {
    const res = await fetch("/api/superadmin/platform-pricing");
    const data = (await res.json()) as { prices?: PlanPrices; message?: string };
    if (!res.ok || !data.prices) {
      throw new Error(data.message ?? "Could not load platform pricing.");
    }
    return data.prices;
    },
  });

  const prices = useMemo(
    () => draftPrices ?? loadedPrices ?? DEFAULT_PRICES,
    [draftPrices, loadedPrices],
  );

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
    setDraftPrices(null);
    queryClient.setQueryData(["superadmin-platform-pricing"], data.prices);
    toast.success("Platform plan prices updated.");
    setSaving(false);
  }

  if (isLoading) {
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
                setDraftPrices((prev) => ({
                  ...(prev ?? prices),
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
