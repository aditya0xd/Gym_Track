"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);
    if (isIos && isSafari && !isStandalone) {
      setShowIosHint(true);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, [isStandalone]);

  if (dismissed || isStandalone) return null;
  if (!deferredPrompt && !showIosHint) return null;

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-3 z-50 mx-auto w-[calc(100%-1rem)] max-w-md rounded-lg border border-border bg-card p-3 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Install GymTrack Pro</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {deferredPrompt
              ? "Add this app to your home screen for a full-screen mobile experience."
              : "On iPhone: tap Share, then Add to Home Screen."}
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-muted-foreground"
          onClick={() => setDismissed(true)}
        >
          Close
        </button>
      </div>
      {deferredPrompt ? (
        <div className="mt-2">
          <Button type="button" size="sm" onClick={install}>
            Install app
          </Button>
        </div>
      ) : null}
    </div>
  );
}
