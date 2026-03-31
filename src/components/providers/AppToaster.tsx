"use client";

import { Toaster } from "@/components/ui/sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      duration={4000}
    />
  );
}
