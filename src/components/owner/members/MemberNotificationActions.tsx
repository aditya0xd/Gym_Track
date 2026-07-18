"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ReminderType = "MEMBERSHIP_EXPIRY" | "PAYMENT_DUE";

export function MemberNotificationActions({ memberId }: { memberId: string }) {
  const [sendingType, setSendingType] = useState<ReminderType | null>(null);

  async function send(reminderType: ReminderType) {
    setSendingType(reminderType);
    const res = await fetch(`/api/owner/members/${memberId}/reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderType }),
    });

    const data = (await res.json()) as {
      message?: string;
      reminder?: { channel?: string; reminderType?: ReminderType };
    };
    if (!res.ok) {
      toast.error(data.message ?? "Could not send reminder.");
      setSendingType(null);
      return;
    }

    const kind =
      data.reminder?.reminderType === "PAYMENT_DUE"
        ? "payment due"
        : "membership expiry";
    toast.success(`Sent ${kind} reminder via ${data.reminder?.channel ?? "channel"}.`);
    setSendingType(null);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={sendingType !== null}
        onClick={() => send("MEMBERSHIP_EXPIRY")}
      >
        {sendingType === "MEMBERSHIP_EXPIRY"
          ? "Sending…"
          : "Membership expiry reminder"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={sendingType !== null}
        onClick={() => send("PAYMENT_DUE")}
      >
        {sendingType === "PAYMENT_DUE" ? "Sending…" : "Payment due reminder"}
      </Button>
    </div>
  );
}
