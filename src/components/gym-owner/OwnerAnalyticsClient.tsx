"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const { data, isLoading, error, refetch, isFetching } = useQuery<OwnerAnalytics, Error>({
    queryKey: ["owner-analytics"],
    queryFn: fetchAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes — analytics don't change every second
  });

  const handleRefresh = () => {
    refetch();
  };

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
        <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-2">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      <OwnerAnalyticsDashboard data={data!} />
    </div>
  );
}
