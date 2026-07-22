"use client";

import { Button } from "@/components/ui/button";

export function OfflineCard() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">You are offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          GymTrack Pro cannot reach the internet right now. Reconnect and try again.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    </main>
  );
}
