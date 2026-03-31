"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import type { MemberBillingDuration } from "@/generated/prisma/client";

type PriceRow = { duration: MemberBillingDuration; priceInr: string | null };

export function DurationPricingForm() {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/owner/pricing");
      if (!res.ok) {
        if (!cancelled) setLoading(false);
        return;
      }
      const data = (await res.json()) as { prices: PriceRow[] };
      if (!cancelled) {
        setRows(data.prices ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setPrice(duration: MemberBillingDuration, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.duration === duration ? { ...r, priceInr: value } : r)),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const prices = rows.map((r) => ({
      duration: r.duration,
      priceInr: r.priceInr ?? "0",
    }));

    const res = await fetch("/api/owner/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prices }),
    });

    const data = (await res.json()) as { message?: string; prices?: PriceRow[] };
    if (!res.ok) {
      setMessage(data.message ?? "Could not save.");
      setSaving(false);
      return;
    }

    if (data.prices) setRows(data.prices);
    setMessage("Saved.");
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading your prices…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-6">
      <p className="text-sm text-slate-400">
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  ₹
                </span>
                <Input
                  id={`price-${opt.value}`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={value}
                  onChange={(ev) => setPrice(opt.value, ev.target.value)}
                  className="border-white/15 bg-slate-900/60 pl-8 text-slate-100"
                  required
                />
              </div>
            </div>
          );
        })}
      </div>

      {message ? (
        <p
          role="status"
          className={
            message === "Saved." ? "text-sm text-emerald-400" : "text-sm text-rose-400"
          }
        >
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save prices"}
      </Button>
    </form>
  );
}
