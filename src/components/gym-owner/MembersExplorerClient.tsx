"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MembersExplorerPanel } from "./MembersExplorerPanel";

type StatusFilter = "ALL" | "EXPIRING_SOON" | "EXPIRED" | "PAUSED";

async function fetchMembers() {
  const res = await fetch("/api/owner/members");
  if (!res.ok) {
    throw new Error("Failed to fetch members");
  }
  return res.json();
}

export function MembersExplorerClient() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status")?.toLowerCase();

  let initialFilter: StatusFilter = "ALL";
  if (statusParam === "expiring") {
    initialFilter = "EXPIRING_SOON";
  } else if (statusParam === "expired") {
    initialFilter = "EXPIRED";
  } else if (statusParam === "paused") {
    initialFilter = "PAUSED";
  }

  const { data: members, isLoading, error } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-semibold text-destructive">Failed to load members</p>
        <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        subtitle="MANAGE"
        title="MEMBERS"
        count={members?.length}
      />
      <MembersExplorerPanel
        members={members ?? []}
        initialStatusFilter={initialFilter}
      />
    </>
  );
}
