"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { formatInrFromDecimalString } from "@/lib/format/inr";
import {
  durationLabel,
  priceForDuration,
  pricedDurations,
  type MembershipPlanDto,
} from "@/lib/membership-plans/client";
import {
  IMAGE_ACCEPT,
  IMAGE_PROCESSING_PRESETS,
} from "@/lib/image-processing/config";
import {
  imageErrorMessage as sharedImageErrorMessage,
  processImage,
} from "@/lib/image-processing/client";
import type {
  MemberBillingDuration,
  PaymentStatus,
} from "@/generated/prisma/client";

function openImagePicker(
  input: HTMLInputElement | null,
  mode: "camera" | "files",
  capture: "user" | "environment",
) {
  if (!input) return;
  if (mode === "camera") {
    input.setAttribute("capture", capture);
  } else {
    input.removeAttribute("capture");
  }
  input.click();
}

export function MemberEnrollForm() {
  const router = useRouter();
  const memberPhotoInputRef = useRef<HTMLInputElement>(null);
  const upiScreenshotInputRef = useRef<HTMLInputElement>(null);
  const [memberPhotoFileName, setMemberPhotoFileName] = useState<string | null>(
    null,
  );
  const [upiFileName, setUpiFileName] = useState<string | null>(null);
  const [plans, setPlans] = useState<MembershipPlanDto[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [duration, setDuration] = useState<MemberBillingDuration>("ONE_MONTH");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("NOT_DONE");
  const [discountStr, setDiscountStr] = useState("");
  const [amountPaidStr, setAmountPaidStr] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/owner/membership-plans");
      if (!res.ok) {
        if (!cancelled) {
          toast.error(
            "Could not load membership plans. Try again or open Pricing.",
          );
        }
        return;
      }
      const data = (await res.json()) as { plans: MembershipPlanDto[] };
      const loaded = data.plans ?? [];
      if (!cancelled) {
        setPlans(loaded);
        if (loaded[0]) {
          setSelectedPlanId(loaded[0].id);
          const firstDuration = pricedDurations(loaded[0])[0]?.duration;
          if (firstDuration) setDuration(firstDuration);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const availableDurations = useMemo(
    () => (selectedPlan ? pricedDurations(selectedPlan) : []),
    [selectedPlan],
  );

  useEffect(() => {
    if (!selectedPlan) return;
    const hasCurrent = availableDurations.some((d) => d.duration === duration);
    if (!hasCurrent && availableDurations[0]) {
      setDuration(availableDurations[0].duration);
    }
  }, [selectedPlan, availableDurations, duration]);

  const hintPrice = useMemo(() => {
    if (!selectedPlan) return null;
    return priceForDuration(selectedPlan, duration);
  }, [selectedPlan, duration]);

  function calculateChargedPreview(discountValue: string) {
    if (!hintPrice) return null;
    const list = Number(hintPrice);
    const disc = discountValue.trim() === "" ? 0 : Number(discountValue);
    if (!Number.isFinite(list) || !Number.isFinite(disc) || disc < 0)
      return null;
    return Math.max(0, list - disc).toFixed(2);
  }

  const chargedPreview = calculateChargedPreview(discountStr);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.error("Select a membership plan.");
      return;
    }
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const emailRaw = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const startDate = String(fd.get("startDate") ?? "").trim();
    const whatsappEnabled = fd.get("whatsappEnabled") === "on";
    const memberPhotoFile = fd.get("memberPhoto");
    const upiScreenshotFile = fd.get("upiScreenshot");

    let memberPhoto: string | null = null;
    let upiScreenshot: string | null = null;

    if (memberPhotoFile instanceof File && memberPhotoFile.size > 0) {
      try {
        const processed = await processImage(
          memberPhotoFile,
          IMAGE_PROCESSING_PRESETS.memberPhoto,
        );
        memberPhoto = processed.dataUrl;
      } catch (err) {
        toast.error(sharedImageErrorMessage(err, "Member photo"));
        setPending(false);
        return;
      }
    }

    if (upiScreenshotFile instanceof File && upiScreenshotFile.size > 0) {
      try {
        const processed = await processImage(
          upiScreenshotFile,
          IMAGE_PROCESSING_PRESETS.upiScreenshot,
        );
        upiScreenshot = processed.dataUrl;
      } catch (err) {
        toast.error(sharedImageErrorMessage(err, "UPI screenshot"));
        setPending(false);
        return;
      }
    }

    const amountPaidTrim = amountPaidStr.trim();
    const discountTrim = discountStr.trim();
    const res = await fetch("/api/owner/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email: emailRaw === "" ? null : emailRaw,
        phone,
        membershipPlanId: selectedPlanId,
        billingDuration: duration,
        startDate,
        whatsappEnabled,
        paymentStatus,
        memberPhoto,
        upiScreenshot,
        discountInr: discountTrim === "" ? undefined : discountTrim,
        amountPaid: amountPaidTrim === "" ? undefined : amountPaidTrim,
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

  const inputClass =
    "flex h-14 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1";

  return (
    <div className="mx-auto w-full min-w-0 max-w-md rounded-t-[32px] md:rounded-[32px] bg-card border border-border p-6 -mx-4 sm:mx-0 shadow-2xl">
      <div className="flex items-start justify-between pb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            New Member
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-foreground">
            Enroll Member
          </h1>
        </div>
        <Link
          href="/owner/dashboard"
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4 stroke-[3]" />
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName" className={labelClass}>
            Full Name
          </Label>
          <input
            id="fullName"
            name="fullName"
            required
            placeholder="e.g. Rahul Sharma"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className={labelClass}>
            Phone Number
          </Label>
          <input
            id="phone"
            name="phone"
            required
            placeholder="+91 98765 43210"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={labelClass}>
            Email (optional)
          </Label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="member@email.com"
            className={inputClass}
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label className={labelClass}>Membership plan</Label>
          {plans.length === 0 ? (
            <p className="text-xs font-medium text-red-400">
              Create a plan under Pricing before enrolling members.
            </p>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}
                      >
                        {plan.name}
                      </span>
                      {plan.category ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          {plan.category}
                        </span>
                      ) : null}
                    </div>
                    {plan.benefits.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {plan.benefits.slice(0, 3).map((b) => (
                          <li
                            key={b.id}
                            className="flex items-center gap-1.5 text-xs text-zinc-400"
                          >
                            <Check className="h-3 w-3 shrink-0 text-primary" />
                            {b.label}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <Label className={labelClass}>Duration</Label>
          <input type="hidden" name="billingDuration" value={duration} />
          <div className="grid grid-cols-2 gap-3">
            {availableDurations.map(({ duration: d, priceInr }) => {
              const isSelected = duration === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex flex-col items-start rounded-xl border-2 p-4 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted hover:bg-muted/80"
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold capitalize ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {durationLabel(d)}
                  </span>
                  <span
                    className={`mt-1 text-2xl font-black ${isSelected ? "text-primary" : "text-foreground"}`}
                  >
                    {priceInr ? formatInrFromDecimalString(priceInr) : "—"}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedPlan && availableDurations.length === 0 && (
            <p className="text-xs font-medium text-red-400">
              This plan has no duration prices. Add pricing under Pricing.
            </p>
          )}
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="discountInr" className={labelClass}>
            Discount (INR)
          </Label>
          <input
            id="discountInr"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={discountStr}
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d.]/g, "");
              setDiscountStr(next);
              const nextCharged = calculateChargedPreview(next);
              if (paymentStatus === "DONE" && nextCharged) {
                setAmountPaidStr(nextCharged);
              }
            }}
            className={inputClass}
          />
          {hintPrice && chargedPreview !== null && discountStr ? (
            <p className="text-xs font-medium text-primary ml-1">
              Final Amount: {formatInrFromDecimalString(chargedPreview)}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-2">
            <Label htmlFor="startDate" className={labelClass}>
              Start date
            </Label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={today}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentStatus" className={labelClass}>
              Payment status
            </Label>
            <select
              id="paymentStatus"
              name="paymentStatus"
              value={paymentStatus}
              onChange={(ev) => {
                const next = ev.target.value as PaymentStatus;
                setPaymentStatus(next);
                const nextCharged = calculateChargedPreview(discountStr);
                if (next === "DONE" && nextCharged) {
                  setAmountPaidStr(nextCharged);
                }
                if (next === "NOT_DONE") {
                  setAmountPaidStr("");
                }
              }}
              className={inputClass}
            >
              <option value="NOT_DONE">Not done</option>
              <option value="PARTIAL">Partial</option>
              <option value="DONE">Done</option>
            </select>
          </div>
        </div>

        {paymentStatus !== "NOT_DONE" ? (
          <div className="space-y-2 pt-2">
            <Label htmlFor="amountPaid" className={labelClass}>
              Amount paid (INR)
            </Label>
            <input
              id="amountPaid"
              inputMode="decimal"
              autoComplete="off"
              placeholder={paymentStatus === "DONE" ? chargedPreview ?? "0" : "0"}
              value={amountPaidStr}
              readOnly={paymentStatus === "DONE"}
              onChange={(e) =>
                setAmountPaidStr(e.target.value.replace(/[^\d.]/g, ""))
              }
              className={inputClass}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-2">
            <Label className={labelClass}>Photo</Label>
            <input
              ref={memberPhotoInputRef}
              id="memberPhoto"
              name="memberPhoto"
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              onChange={(e) =>
                setMemberPhotoFileName(e.target.files?.[0]?.name ?? null)
              }
            />
            <button
              type="button"
              onClick={() =>
                openImagePicker(
                  memberPhotoInputRef.current,
                  "camera",
                  "environment",
                )
              }
              className={`flex h-14 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed ${memberPhotoFileName ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted text-muted-foreground hover:border-border/80"} transition-colors`}
            >
              <span className="text-xs font-bold uppercase tracking-wider">
                {memberPhotoFileName ? "Photo Selected" : "Take Photo"}
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <Label className={labelClass}>UPI</Label>
            <input
              ref={upiScreenshotInputRef}
              id="upiScreenshot"
              name="upiScreenshot"
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              onChange={(e) =>
                setUpiFileName(e.target.files?.[0]?.name ?? null)
              }
            />
            <button
              type="button"
              onClick={() =>
                openImagePicker(
                  upiScreenshotInputRef.current,
                  "camera",
                  "environment",
                )
              }
              className={`flex h-14 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed ${upiFileName ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted text-muted-foreground hover:border-border/80"} transition-colors`}
            >
              <span className="text-xs font-bold uppercase tracking-wider">
                {upiFileName ? "UPI Selected" : "Add UPI"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 ml-1">
          <input
            id="whatsappEnabled"
            name="whatsappEnabled"
            type="checkbox"
            defaultChecked
            className="size-4 rounded border-border bg-muted accent-primary"
          />
          <Label
            htmlFor="whatsappEnabled"
            className="text-xs font-medium text-muted-foreground"
          >
            Send WhatsApp reminders
          </Label>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={pending || !selectedPlanId || !hintPrice}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-extrabold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
          >
            {pending ? "Saving…" : "Enroll Member"}
            {!pending && <ArrowRight className="h-4 w-4 stroke-[3]" />}
          </button>
        </div>
      </form>
    </div>
  );
}
