"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { MembershipStatus } from "@/generated/prisma/client";

export function MemberMembershipActions({
  memberId,
  membershipStatus,
  canPause,
  onSuccess,
}: {
  memberId: string;
  membershipStatus: MembershipStatus;
  /** False when membership is already expired — pause is not allowed. */
  canPause: boolean;
  /** Callback to refresh member data after successful action */
  onSuccess?: () => void;
}) {
  const router = useRouter();

  async function apply(action: "pause" | "resume") {
    try {
      const res = await fetch(`/api/owner/members/${memberId}/membership-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message ?? "Could not update membership.");
        return;
      }
      toast.success(data.message ?? "Updated.");
      onSuccess?.();
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {membershipStatus === "ACTIVE" ? (
        <Button
          type="button"
          variant="outline"
          disabled={!canPause}
          onClick={() => apply("pause")}
          title={
            canPause ? undefined : "Cannot pause an expired membership."
          }
        >
          Pause / freeze
        </Button>
      ) : membershipStatus === "PAUSED" ? (
        <Button type="button" onClick={() => apply("resume")}>
          Resume membership
        </Button>
      ) : null}
    </div>
  );
}
