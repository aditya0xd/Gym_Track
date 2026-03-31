"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [{ href: "/superadmin/gym-owners", label: "Gym owners" }];

export function SuperAdminMainNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-violet-950/50 bg-slate-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-violet-200">
            Superadmin
          </span>
          <nav className="flex flex-wrap gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === l.href
                    ? "bg-violet-500/20 text-violet-100"
                    : "text-slate-400 hover:text-violet-100",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-[200px] truncate text-xs text-slate-400 sm:inline">
            {email}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-violet-500/30 text-violet-100"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
