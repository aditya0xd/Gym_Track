"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_PORTALS } from "@/lib/constants/billing";
import { cn } from "@/lib/utils";

type SuperAdminLoginFormProps = {
  className?: string;
};

export function SuperAdminLoginForm({ className }: SuperAdminLoginFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "")
      .toLowerCase()
      .trim();
    const password = String(fd.get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      portal: AUTH_PORTALS.SUPERADMIN,
      redirect: false,
    });

    if (!result || result.error) {
      setMessage("Invalid superadmin email or password.");
      setPending(false);
      return;
    }

    router.push("/superadmin/gym-owners");
    router.refresh();
  }

  return (
    <Card className={cn("w-full max-w-md border-violet-500/20", className)}>
      <CardHeader>
        <CardTitle className="text-violet-100">Superadmin</CardTitle>
        <CardDescription>
          Assign gym owner plans (trial, starter, pro) and extend trial periods.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sa-email">Email</Label>
            <Input
              id="sa-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="border-white/15 bg-slate-900/60"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-password">Password</Label>
            <Input
              id="sa-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="border-white/15 bg-slate-900/60"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          {message ? (
            <p className="text-sm text-rose-500" role="alert">
              {message}
            </p>
          ) : null}
        </form>

        <div className="space-y-2 border-t border-violet-500/20 pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full border-violet-500/30"
            disabled={logoutPending}
            onClick={async () => {
              setLogoutPending(true);
              await signOut({ callbackUrl: "/superadmin/login" });
              setLogoutPending(false);
            }}
          >
            {logoutPending ? "Signing out…" : "Sign out (any account)"}
          </Button>
          <p className="text-center text-xs text-slate-500">
            Gym owner?{" "}
            <Link href="/owner/login" className="text-slate-300 hover:underline">
              Owner login
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
