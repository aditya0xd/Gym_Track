"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { OwnerAnalyticsDashboard } from "./OwnerAnalyticsDashboard";
import type { OwnerAnalytics } from "@/server/gym-owner/analytics.service";

async function fetchAnalytics(): Promise<OwnerAnalytics> {
  const res = await fetch("/api/owner/analytics");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to fetch analytics");
  }
  return res.json();
}

export function OwnerAnalyticsClient() {
  const { data, isLoading, error } = useQuery<OwnerAnalytics, Error>({
    queryKey: ["owner-analytics"],
    queryFn: fetchAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes — analytics don't change every second
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-semibold text-destructive">Failed to load analytics</p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return <OwnerAnalyticsDashboard data={data!} />;
}
