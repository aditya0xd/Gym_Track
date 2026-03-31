"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bolt, Users } from "lucide-react";

import { cn } from "@/lib/utils";

function isMembersPath(pathname: string) {
  return pathname.startsWith("/owner/members");
}

export function OwnerBottomNav() {
  const pathname = usePathname();
  const dashboardActive = pathname === "/owner/dashboard";
  const membersActive = isMembersPath(pathname);

  const itemClass = (active: boolean) =>
    cn(
      "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[10px] uppercase tracking-wide",
      active ? "text-foreground" : "text-muted-foreground",
    );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-stretch gap-1 px-2 py-1">
        <Link href="/owner/dashboard" className={itemClass(dashboardActive)}>
          <Bolt className="size-4" />
          Dashboard
        </Link>
        <Link href="/owner/members" className={itemClass(membersActive)}>
          <Users className="size-4" />
          Members
        </Link>
      </div>
    </nav>
  );
}
