"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import { cn } from "@/lib/utils";
import type { MemberBillingDuration } from "@/generated/prisma/client";

type PriceHint = { duration: MemberBillingDuration; priceInr: string | null };

export function MemberEnrollForm() {
  const router = useRouter();
  const [hints, setHints] = useState<PriceHint[]>([]);
  const [duration, setDuration] =
    useState<MemberBillingDuration>("ONE_MONTH");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/owner/pricing");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { prices: PriceHint[] };
      if (!cancelled) setHints(data.prices ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hintPrice = useMemo(() => {
    return hints.find((h) => h.duration === duration)?.priceInr ?? null;
  }, [hints, duration]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const emailRaw = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const startDate = String(fd.get("startDate") ?? "").trim();
    const whatsappEnabled = fd.get("whatsappEnabled") === "on";

    const res = await fetch("/api/owner/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email: emailRaw === "" ? null : emailRaw,
        phone,
        billingDuration: duration,
        startDate,
        whatsappEnabled,
      }),
    });

    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      setMessage(data.message ?? "Could not enroll member.");
      setPending(false);
      return;
    }

    router.push("/owner/dashboard");
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          placeholder="Member name"
          className="border-white/15 bg-slate-900/60 text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="member@email.com"
          className="border-white/15 bg-slate-900/60 text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          required
          placeholder="10-digit mobile"
          className="border-white/15 bg-slate-900/60 text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="billingDuration">Membership duration</Label>
        <select
          id="billingDuration"
          name="billingDuration"
          value={duration}
          onChange={(ev) =>
            setDuration(ev.target.value as MemberBillingDuration)
          }
          className="flex h-10 w-full rounded-md border border-white/15 bg-slate-900/60 px-3 text-sm text-slate-100"
        >
          {MEMBER_BILLING_DURATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {hintPrice ? (
          <p className="text-xs text-slate-400">
            Your list price:{" "}
            <span className="text-slate-200">
              {formatInrFromDecimalString(hintPrice)}
            </span>{" "}
            (charged on enroll)
          </p>
        ) : (
          <p className="text-xs text-amber-200/90">
            Set this duration&apos;s INR price under Pricing before enrolling.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">Start date</Label>
        <Input
          id="startDate"
          name="startDate"
          type="date"
          required
          defaultValue={today}
          className="border-white/15 bg-slate-900/60 text-slate-100"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="whatsappEnabled"
          name="whatsappEnabled"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 rounded border-white/20 bg-slate-900"
        />
        <Label htmlFor="whatsappEnabled" className="font-normal text-slate-300">
          WhatsApp reminders (otherwise SMS)
        </Label>
      </div>

      {message ? (
        <p role="alert" className="text-sm text-rose-400">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Enroll member"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/owner/dashboard" className={cn("border-white/20 text-slate-100")}>
            Cancel
          </Link>
        </Button>
      </div>
    </form>
  );
}
