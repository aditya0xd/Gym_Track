"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/owner/dashboard", label: "Dashboard" },
  { href: "/owner/members", label: "Members" },
  { href: "/owner/members/bulk", label: "Bulk CSV" },
  { href: "/owner/members/new", label: "Enroll member" },
  { href: "/owner/pricing", label: "Pricing (INR)" },
  { href: "/owner/analytics", label: "Analytics" },
  { href: "/owner/manage-plan", label: "Manage plan" },
];

function navLinkClass(active: boolean, mobile = false) {
  if (mobile) {
    return cn(
      "flex min-h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors",
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border bg-background text-foreground hover:bg-muted",
    );
  }

  return cn(
    "block rounded-md px-3 py-3 text-sm font-medium transition-colors md:inline-block md:py-2",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function OwnerMainNav({ email }: { email: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="border-b border-border bg-card/80 shadow-sm backdrop-blur-sm">
      <div className="mx-auto min-w-0 max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Gym owner
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-expanded={menuOpen}
            aria-controls="owner-mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        <div className="hidden min-w-0 flex-col gap-3 md:flex md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <span className="shrink-0 text-sm font-semibold tracking-tight text-foreground">
              Gym owner
            </span>
            <nav className="flex flex-wrap gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={navLinkClass(pathname === l.href)}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="max-w-[220px] truncate text-xs text-muted-foreground">
              {email}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </Button>
          </div>
        </div>
        <div
          id="owner-mobile-nav"
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-200 ease-out md:hidden",
            menuOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0",
          )}
          aria-hidden={!menuOpen}
        >
          <div className="mt-3 rounded-lg border border-border bg-card p-3 shadow-sm">
            <nav className="flex flex-col gap-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={navLinkClass(pathname === l.href, true)}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-3 truncate text-xs text-muted-foreground">{email}</p>
              <Button
                type="button"
                variant="outline"
                className="w-full min-h-11"
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
