"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import type { MemberBillingDuration } from "@/generated/prisma/client";

type PriceRow = { duration: MemberBillingDuration; priceInr: string | null };

async function fetchPricing(): Promise<{ prices: PriceRow[] }> {
  const res = await fetch("/api/owner/pricing");
  if (!res.ok) {
    throw new Error("Could not load your prices.");
  }
  return res.json();
}

export function DurationPricingForm() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<PriceRow[]>([]);

  // 1. Fetching pricing with useQuery
  const { data, isLoading, error } = useQuery({
    queryKey: ["pricing"],
    queryFn: fetchPricing,
  });

  // Keep local editing state in sync when query data is loaded/updated
  useEffect(() => {
    if (data?.prices) {
      setRows(data.prices);
    }
  }, [data]);

  // Display error toast if query fails
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load pricing.");
    }
  }, [error]);

  // 2. Saving pricing with useMutation
  const mutation = useMutation({
    mutationFn: async (prices: { duration: MemberBillingDuration; priceInr: string }[]) => {
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
      toast.success("Pricing updated successfully.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function setPrice(duration: MemberBillingDuration, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.duration === duration ? { ...r, priceInr: value } : r)),
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();

    const prices = rows.map((r) => ({
      duration: r.duration,
      priceInr: r.priceInr ?? "0",
    }));

    mutation.mutate(prices);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your prices…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full min-w-0 max-w-md space-y-6">
      <p className="text-sm text-muted-foreground">
        Set list prices in INR for each membership length. These amounts apply when
        you enroll a member for that duration.
      </p>

      <div className="space-y-4">
        {MEMBER_BILLING_DURATION_OPTIONS.map((opt) => {
          const row = rows.find((r) => r.duration === opt.value);
          const value = row?.priceInr ?? "";
          return (
            <div key={opt.value} className="space-y-2">
              <Label htmlFor={`price-${opt.value}`}>{opt.label}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ₹
                </span>
                <Input
                  id={`price-${opt.value}`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={value}
                  onChange={(ev) => setPrice(opt.value, ev.target.value)}
                  className="pl-8"
                  required
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save prices"}
      </Button>
    </form>
  );
}
