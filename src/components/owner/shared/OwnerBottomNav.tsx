"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, BarChart3, Tag, User, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

export function OwnerBottomNav() {
  const pathname = usePathname();
  const dashboardActive = pathname === "/owner/dashboard";
  const membersActive = pathname.startsWith("/owner/members");
  const analyticsActive = pathname.startsWith("/owner/analytics");
  const pricingActive = pathname.startsWith("/owner/pricing");
  const profileActive = pathname.startsWith("/owner/profile");

  const itemClass = (active: boolean) =>
    cn(
      "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[10px] uppercase min-w-0 transition-colors",
      active ? "text-primary" : "text-muted-foreground hover:text-foreground/80",
    );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-stretch gap-1 px-2 py-1">
        <Link href="/owner/dashboard" className={itemClass(dashboardActive)}>
          <LayoutGrid className="size-4 shrink-0" />
          <span className="truncate w-full text-center">Dashboard</span>
        </Link>
        <Link href="/owner/members" className={itemClass(membersActive)}>
          <Users className="size-4 shrink-0" />
          <span className="truncate w-full text-center">Members</span>
        </Link>
        <Link href="/owner/analytics" className={itemClass(analyticsActive)}>
          <BarChart3 className="size-4 shrink-0" />
          <span className="truncate w-full text-center">Analytics</span>
        </Link>
        <Link href="/owner/pricing" className={itemClass(pricingActive)}>
          <Tag className="size-4 shrink-0" />
          <span className="truncate w-full text-center">Pricing</span>
        </Link>
        <Link href="/owner/profile" className={itemClass(profileActive)}>
          <User className="size-4 shrink-0" />
          <span className="truncate w-full text-center">Profile</span>
        </Link>
      </div>
      {(pathname === "/owner/dashboard" || pathname === "/owner/members") && (
        <Link
          href="/owner/members/new"
          className="absolute -top-16 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 md:hidden"
          aria-label="Enroll member"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </Link>
      )}
    </nav>
  );
}

