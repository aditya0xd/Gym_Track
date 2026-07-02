"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, BarChart3, Tag, User } from "lucide-react";

import { cn } from "@/lib/utils";

export function OwnerBottomNav() {
  const pathname = usePathname();
  const dashboardActive = pathname === "/owner/dashboard";
  const membersActive = pathname.startsWith("/owner/members");
  const analyticsActive = pathname.startsWith("/owner/analytics");
  const pricingActive = pathname.startsWith("/owner/pricing");
  const profileActive = pathname.startsWith("/owner/manage-plan");

  const itemClass = (active: boolean) =>
    cn(
      "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[10px] uppercase tracking-wide",
      active ? "text-foreground" : "text-muted-foreground",
    );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-stretch gap-1 px-2 py-1">
        <Link href="/owner/dashboard" className={itemClass(dashboardActive)}>
          <LayoutGrid className="size-4" />
          Dashboard
        </Link>
        <Link href="/owner/members" className={itemClass(membersActive)}>
          <Users className="size-4" />
          Members
        </Link>
        <Link href="/owner/analytics" className={itemClass(analyticsActive)}>
          <BarChart3 className="size-4" />
          Analytics
        </Link>
        <Link href="/owner/pricing" className={itemClass(pricingActive)}>
          <Tag className="size-4" />
          Pricing
        </Link>
        <Link href="/owner/manage-plan" className={itemClass(profileActive)}>
          <User className="size-4" />
          Profile
        </Link>
      </div>
    </nav>
  );
}

