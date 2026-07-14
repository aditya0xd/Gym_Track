"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Check, X, Zap } from "lucide-react";

import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import type { MemberBillingDuration } from "@/generated/prisma/client";
import { MembershipPlansManager } from "./MembershipPlansManager";

/**
 * @deprecated Use `MembershipPlansManager` instead.
 */
export function DurationPricingForm() {
  return <MembershipPlansManager />;
}

type PriceRow = { duration: MemberBillingDuration; priceInr: string | null };

const DURATION_FEATURES: Record<MemberBillingDuration, string[]> = {
  ONE_MONTH: ["Full gym access", "Locker facility", "1 free trainer session"],
  THREE_MONTHS: ["Full gym access", "Locker facility", "5 trainer sessions", "Diet plan"],
  SIX_MONTHS: ["Full gym access", "Locker facility", "Unlimited trainer sessions", "Diet plan", "Body composition test"],
  TWELVE_MONTHS: ["Full gym access", "Locker facility", "Unlimited trainer sessions", "Diet plan", "Body composition test", "Premium merchandise"],
};

const MOST_POPULAR: MemberBillingDuration = "THREE_MONTHS";



async function fetchPricing(): Promise<{ prices: PriceRow[] }> {
  const res = await fetch("/api/owner/pricing");
  if (!res.ok) {
    throw new Error("Could not load your prices.");
  }
  return res.json();
}

function PricingFormLegacy() {
  const queryClient = useQueryClient();
  const [editingDuration, setEditingDuration] = useState<MemberBillingDuration | null>(null);
  const [editValue, setEditValue] = useState("");

  // 1. Fetching pricing with useQuery
  const { data, isLoading, error } = useQuery({
    queryKey: ["pricing"],
    queryFn: fetchPricing,
  });
  const rows = data?.prices ?? [];

  // Display error toast if query fails
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load pricing.");
    }
  }, [error]);

  // 2. Saving pricing with useMutation
  const mutation = useMutation({
    mutationFn: async (
      prices: { duration: MemberBillingDuration; priceInr: string }[],
    ) => {
      const res = await fetch("/api/owner/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices }),
      });
      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.message ?? "Could not save prices.");
      }
      return responseData as { message?: string; prices?: PriceRow[] };
    },
    onSuccess: (responseData) => {
      if (responseData.prices) {
        queryClient.setQueryData(["pricing"], responseData);
      } else {
        queryClient.invalidateQueries({ queryKey: ["pricing"] });
      }
      toast.success("Price updated.");
      setEditingDuration(null);
      setEditValue("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function startEdit(duration: MemberBillingDuration, currentPrice: string | null) {
    setEditingDuration(duration);
    setEditValue(currentPrice ?? "");
  }

  function cancelEdit() {
    setEditingDuration(null);
    setEditValue("");
  }

  function saveEdit(duration: MemberBillingDuration) {
    const newPrice = editValue || "0";
    // Optimistically update cached query data so the UI reflects the change.
    const updatedRows = rows.map((r) =>
      r.duration === duration ? { ...r, priceInr: newPrice } : r,
    );
    queryClient.setQueryData(["pricing"], { prices: updatedRows });
    const allPrices = updatedRows.map((r) => ({
      duration: r.duration,
      priceInr: r.priceInr ?? "0",
    }));
    mutation.mutate(allPrices);
  }


  const durationLabel = (value: MemberBillingDuration) => {
    const opt = MEMBER_BILLING_DURATION_OPTIONS.find((o) => o.value === value);
    if (!opt) return value;
    return opt.label.toLowerCase() === "12 months" ? "1 Year" : opt.label;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#d4ff00]" />
        <p className="text-sm text-zinc-400">Loading your prices…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {MEMBER_BILLING_DURATION_OPTIONS.map((opt) => {
        const row = rows.find((r) => r.duration === opt.value);
        const price = row?.priceInr;
        const isPopular = opt.value === MOST_POPULAR;
        const isEditing = editingDuration === opt.value;
        const features = DURATION_FEATURES[opt.value];

        return (
          <div
            key={opt.value}
            className={`relative rounded-2xl border bg-card transition-colors ${
              isPopular ? "border-[#d4ff00]/30" : "border-border"
            }`}
          >
            {isPopular && (
              <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-[#d4ff00] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
                <Zap className="h-3 w-3 fill-black stroke-0" />
                Most Popular
              </div>
            )}

            <div className="p-5">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-black text-foreground capitalize">{durationLabel(opt.value)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Membership</p>
                </div>
                <div className="shrink-0 text-right">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-black text-[#d4ff00]">₹</span>
                      <input
                        autoFocus
                        type="text"
                        inputMode="decimal"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value.replace(/[^\d.]/g, ""))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(opt.value);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="w-24 rounded-lg bg-muted px-2 py-1 text-right text-xl font-black text-[#d4ff00] outline-none ring-1 ring-[#d4ff00]/50 focus:ring-[#d4ff00]"
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <p className={`text-3xl font-black ${isPopular ? "text-[#d4ff00]" : "text-foreground"}`}>
                      {price && Number(price) > 0
                        ? formatInrFromDecimalString(price)
                        : <span className="text-muted-foreground text-lg font-medium">Not set</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="mt-4 space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#d4ff00]" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Action buttons */}
              <div className="mt-5 flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => saveEdit(opt.value)}
                      disabled={mutation.isPending}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#d4ff00] py-2.5 text-[11px] font-black uppercase tracking-widest text-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
                    >
                      {mutation.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Check className="h-4 w-4 stroke-[3]" />}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(opt.value, price ?? null)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-muted py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
