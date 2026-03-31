"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import type { MemberBillingDuration } from "@/generated/prisma/client";

type PriceHint = { duration: MemberBillingDuration; priceInr: string | null };

export function MemberEnrollForm() {
  const router = useRouter();
  const [hints, setHints] = useState<PriceHint[]>([]);
  const [duration, setDuration] =
    useState<MemberBillingDuration>("ONE_MONTH");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/owner/pricing");
      if (!res.ok) {
        if (!cancelled) {
          toast.error("Could not load your pricing. Try again or open Pricing.");
        }
        return;
      }
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
      toast.error(data.message ?? "Could not enroll member.");
      setPending(false);
      return;
    }

    toast.success(`Enrolled ${fullName}.`);
    router.push("/owner/dashboard");
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full min-w-0 max-w-lg space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          placeholder="Member name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="member@email.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          required
          placeholder="10-digit mobile"
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
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {MEMBER_BILLING_DURATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {hintPrice ? (
          <p className="text-xs text-muted-foreground">
            Your list price:{" "}
            <span className="font-medium text-foreground">
              {formatInrFromDecimalString(hintPrice)}
            </span>{" "}
            (charged on enroll)
          </p>
        ) : (
          <p className="text-xs font-medium text-foreground">
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
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="whatsappEnabled"
          name="whatsappEnabled"
          type="checkbox"
          defaultChecked
          className="size-4 rounded border-input accent-black"
        />
        <Label htmlFor="whatsappEnabled" className="font-normal text-muted-foreground">
          WhatsApp reminders (otherwise SMS)
        </Label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Enroll member"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/owner/dashboard">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
