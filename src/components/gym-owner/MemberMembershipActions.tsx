"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { MembershipStatus } from "@/generated/prisma/client";

export function MemberMembershipActions({
  memberId,
  membershipStatus,
  canPause,
}: {
  memberId: string;
  membershipStatus: MembershipStatus;
  /** False when membership is already expired — pause is not allowed. */
  canPause: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function apply(action: "pause" | "resume") {
    setLoading(true);
    const res = await fetch(`/api/owner/members/${memberId}/membership-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await res.json()) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      toast.error(data.message ?? "Could not update membership.");
      return;
    }
    toast.success(data.message ?? "Updated.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {membershipStatus === "ACTIVE" ? (
        <Button
          type="button"
          variant="outline"
          disabled={loading || !canPause}
          onClick={() => apply("pause")}
          title={
            canPause ? undefined : "Cannot pause an expired membership."
          }
        >
          {loading ? "Working…" : "Pause / freeze"}
        </Button>
      ) : (
        <Button type="button" disabled={loading} onClick={() => apply("resume")}>
          {loading ? "Working…" : "Resume membership"}
        </Button>
      )}
    </div>
  );
}
