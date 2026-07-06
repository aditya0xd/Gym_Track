"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { formatInrFromDecimalString } from "@/lib/format/inr";
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

type PriceHint = { duration: MemberBillingDuration; priceInr: string | null };

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
  const [hints, setHints] = useState<PriceHint[]>([]);
  const [duration, setDuration] = useState<MemberBillingDuration>("ONE_MONTH");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("NOT_DONE");
  const [discountStr, setDiscountStr] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/owner/pricing");
      if (!res.ok) {
        if (!cancelled) {
          toast.error(
            "Could not load your pricing. Try again or open Pricing.",
          );
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

  const chargedPreview = useMemo(() => {
    if (!hintPrice) return null;
    const list = Number(hintPrice);
    const disc = discountStr.trim() === "" ? 0 : Number(discountStr);
    if (!Number.isFinite(list) || !Number.isFinite(disc) || disc < 0)
      return null;
    return Math.max(0, list - disc).toFixed(2);
  }, [hintPrice, discountStr]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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

    if (paymentStatus === "DONE" && !upiScreenshot) {
      toast.error("Upload UPI screenshot when payment is done.");
      setPending(false);
      return;
    }

    const discountTrim = discountStr.trim();
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
        paymentStatus,
        memberPhoto,
        upiScreenshot,
        discountInr: discountTrim === "" ? undefined : discountTrim,
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
    "flex h-14 w-full rounded-xl border-0 bg-[#27272a] px-4 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4ff00]";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-1";

  return (
    <div className="mx-auto w-full min-w-0 max-w-md rounded-t-[32px] md:rounded-[32px] bg-[#18181b] p-6 -mx-4 sm:mx-0 shadow-2xl">
      <div className="flex items-start justify-between pb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4ff00]">
            New Member
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            Enroll Member
          </h1>
        </div>
        <Link
          href="/owner/dashboard"
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
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
            placeholder="e.g. Shahid Khan"
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
          <Label className={labelClass}>Choose Plan</Label>
          <input type="hidden" name="billingDuration" value={duration} />
          <div className="grid grid-cols-2 gap-3">
            {MEMBER_BILLING_DURATION_OPTIONS.map((o) => {
              const isSelected = duration === o.value;
              const p = hints.find((h) => h.duration === o.value)?.priceInr;
              let labelTrimmed = o.label;
              if (labelTrimmed.toLowerCase() === "12 months")
                labelTrimmed = "1 Year";

              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setDuration(o.value)}
                  className={`flex flex-col items-start rounded-xl border-2 p-4 transition-colors ${
                    isSelected
                      ? "border-[#d4ff00] bg-zinc-800/40"
                      : "border-transparent bg-[#27272a] hover:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold capitalize ${isSelected ? "text-[#d4ff00]" : "text-zinc-300"}`}
                  >
                    {labelTrimmed}
                  </span>
                  <span
                    className={`mt-1 text-2xl font-black ${isSelected ? "text-[#d4ff00]" : "text-white"}`}
                  >
                    {p ? formatInrFromDecimalString(p) : "—"}
                  </span>
                </button>
              );
            })}
          </div>
          {!hintPrice && (
            <p className="text-xs font-medium text-red-400">
              Set this duration&apos;s INR price under Pricing before enrolling.
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
            onChange={(e) =>
              setDiscountStr(e.target.value.replace(/[^\d.]/g, ""))
            }
            className={inputClass}
          />
          {hintPrice && chargedPreview !== null && discountStr ? (
            <p className="text-xs font-medium text-[#d4ff00] ml-1">
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
              onChange={(ev) =>
                setPaymentStatus(ev.target.value as PaymentStatus)
              }
              className={inputClass}
            >
              <option value="NOT_DONE">Not done</option>
              <option value="DONE">Done</option>
            </select>
          </div>
        </div>

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
              className={`flex h-14 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed ${memberPhotoFileName ? "border-[#d4ff00] bg-[#d4ff00]/5 text-[#d4ff00]" : "border-zinc-700 bg-[#27272a] text-zinc-400 hover:border-zinc-500"} transition-colors`}
            >
              <span className="text-xs font-bold uppercase tracking-wider">
                {memberPhotoFileName ? "Photo Selected" : "Take Photo"}
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <Label className={labelClass}>
              UPI {paymentStatus === "DONE" ? "*" : ""}
            </Label>
            <input
              ref={upiScreenshotInputRef}
              id="upiScreenshot"
              name="upiScreenshot"
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              required={paymentStatus === "DONE"}
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
              className={`flex h-14 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed ${upiFileName ? "border-[#d4ff00] bg-[#d4ff00]/5 text-[#d4ff00]" : "border-zinc-700 bg-[#27272a] text-zinc-400 hover:border-zinc-500"} transition-colors`}
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
            className="size-4 rounded border-zinc-700 bg-[#27272a] accent-[#d4ff00]"
          />
          <Label
            htmlFor="whatsappEnabled"
            className="text-xs font-medium text-zinc-400"
          >
            Send WhatsApp reminders
          </Label>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={pending}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#d4ff00] text-[13px] font-extrabold uppercase tracking-widest text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
          >
            {pending ? "Saving…" : "Enroll Member"}
            {!pending && <ArrowRight className="h-4 w-4 stroke-[3]" />}
          </button>
        </div>
      </form>
    </div>
  );
}
