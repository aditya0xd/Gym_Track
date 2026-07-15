"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { IMAGE_ACCEPT, IMAGE_PROCESSING_PRESETS } from "@/lib/image-processing/config";
import { imageErrorMessage as sharedImageErrorMessage, processImage } from "@/lib/image-processing/client";

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

type UpdateMemberPayload = {
  fullName: string;
  email: string | null;
  phone: string;
  whatsappEnabled: boolean;
  memberPhoto?: string | null;
};

export function MemberEditClient({ id }: { id: string }) {
  const router = useRouter();
  const memberPhotoInputRef = useRef<HTMLInputElement>(null);
  const [memberPhotoFileName, setMemberPhotoFileName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { data: member, isLoading, error } = useQuery({
    queryKey: ["member", id],
    queryFn: async () => {
      const res = await fetch(`/api/owner/members/${id}`);
      if (!res.ok) throw new Error("Could not load member details");
      return res.json();
    },
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const emailRaw = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const whatsappEnabled = fd.get("whatsappEnabled") === "on";
    const memberPhotoFile = fd.get("memberPhoto");

    let memberPhoto: string | null = null;
    let photoModified = false;

    if (memberPhotoFile instanceof File && memberPhotoFile.size > 0) {
      photoModified = true;
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

    const payload: UpdateMemberPayload = {
      fullName,
      email: emailRaw === "" ? null : emailRaw,
      phone,
      whatsappEnabled,
    };

    if (photoModified) {
      payload.memberPhoto = memberPhoto;
    }

    const res = await fetch(`/api/owner/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.message ?? "Could not update member.");
      setPending(false);
      return;
    }

    toast.success(`Updated ${fullName}.`);
    router.push(`/owner/members/${id}`);
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-primary">
        Loading...
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-destructive">
        Error loading member details.
      </div>
    );
  }

  const inputClass =
    "flex h-14 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1";

  return (
    <div className="mx-auto w-full min-w-0 max-w-md rounded-t-[32px] md:rounded-[32px] bg-card border border-border p-6 -mx-4 sm:mx-0 shadow-2xl">
      <div className="flex items-start justify-between pb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Edit Profile
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-foreground">
            {member.fullName}
          </h1>
        </div>
        <Link
          href={`/owner/members/${id}`}
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
            defaultValue={member.fullName}
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
            defaultValue={member.phone}
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
            defaultValue={member.email ?? ""}
            placeholder="member@email.com"
            className={inputClass}
          />
        </div>

        <div className="space-y-2 pt-2">
          <Label className={labelClass}>New Photo (Optional)</Label>
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
              {memberPhotoFileName ? "New Photo Selected" : "Take New Photo"}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2 ml-1">
          <input
            id="whatsappEnabled"
            name="whatsappEnabled"
            type="checkbox"
            defaultChecked={member.whatsappEnabled}
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
            disabled={pending}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-extrabold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
          >
            {pending ? "Saving…" : "Save Changes"}
            {!pending && <ArrowRight className="h-4 w-4 stroke-[3]" />}
          </button>
        </div>
      </form>
    </div>
  );
}
