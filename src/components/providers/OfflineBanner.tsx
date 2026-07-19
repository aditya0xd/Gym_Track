"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set initial status
    setIsOffline(!window.navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4 md:px-0">
      <div className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-yellow-600 shadow-lg backdrop-blur-md dark:border-yellow-500/30 dark:bg-yellow-950/40 dark:text-yellow-400">
        <WifiOff className="h-5 w-5 shrink-0 animate-pulse" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-none">You are offline</p>
          <p className="mt-1 text-[11px] font-medium leading-none opacity-90">
            Showing cached data!
          </p>
        </div>
      </div>
    </div>
  );
}
