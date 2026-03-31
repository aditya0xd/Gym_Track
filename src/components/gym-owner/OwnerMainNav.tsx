"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/owner/dashboard", label: "Members" },
  { href: "/owner/members/new", label: "Enroll member" },
  { href: "/owner/pricing", label: "Pricing (INR)" },
];

export function OwnerMainNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            Gym owner
          </span>
          <nav className="flex flex-wrap gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === l.href
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white",
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
            className="border-white/20 text-slate-100"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
