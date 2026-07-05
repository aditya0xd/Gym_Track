"use client";

import { useState } from "react";
import { formatInrFromDecimalString } from "@/lib/format/inr";

interface RevenueAtRiskCardProps {
  weekRevenue: number;
  weekCount: number;
  monthRevenue: number;
  monthCount: number;
}

export function RevenueAtRiskCard({
  weekRevenue,
  weekCount,
  monthRevenue,
  monthCount,
}: RevenueAtRiskCardProps) {
  const [period, setPeriod] = useState<"week" | "month">("week");

  const currentRevenue = period === "week" ? weekRevenue : monthRevenue;
  const currentCount = period === "week" ? weekCount : monthCount;
  const periodLabel = period === "week" ? "this week" : "this month";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-500/10 bg-gradient-to-r from-red-950/45 to-zinc-900/90 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-red-500">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          REVENUE AT RISK
        </div>
        <div className="flex items-center gap-1 rounded-full bg-zinc-800 p-1">
          <button
            onClick={() => setPeriod("week")}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              period === "week"
                ? "bg-[#d4ff00] text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              period === "month"
                ? "bg-[#d4ff00] text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Month
          </button>
        </div>
      </div>
      <div className="mt-5">
        <p className="text-4xl font-black tracking-tight text-white">
          {formatInrFromDecimalString(currentRevenue)}
        </p>
        <p className="mt-2.5 text-xs text-muted-foreground">
          from {currentCount} expiring members {periodLabel}
        </p>
      </div>
    </div>
  );
}
