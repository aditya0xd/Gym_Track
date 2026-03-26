"use client";

import { useActionState } from "react";

import { login, logout, refreshTokens } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthState = {
  success: boolean;
  message: string;
} | null;

type LoginFormProps = {
  className?: string;
};

export default function LoginForm({ className }: LoginFormProps) {
  const [loginState, loginAction, loginPending] = useActionState<
    AuthState,
    FormData
  >(async (_prevState, formData) => login(formData), null);

  const [refreshState, refreshAction, refreshPending] = useActionState<
    AuthState,
    FormData
  >(async () => refreshTokens(), null);

  const [logoutState, logoutAction, logoutPending] = useActionState<
    AuthState,
    FormData
  >(async () => logout(), null);

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>Gym access</CardTitle>
        <CardDescription>
          JWT cookies: access token (15m) + refresh token (7d).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form action={loginAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@gym.local"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="GymPass123!"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loginPending}>
            {loginPending ? "Signing in…" : "Sign in"}
          </Button>

          {loginState?.message ? (
            <p
              role="status"
              className={cn(
                "text-sm",
                loginState.success ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {loginState.message}
            </p>
          ) : null}
        </form>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Demo credentials</p>
          <p className="mt-2">Email: admin@gym.local</p>
          <p>Password: GymPass123!</p>
          <p className="mt-2 text-muted-foreground">
            Override via <code>DEMO_AUTH_EMAIL</code> and{" "}
            <code>DEMO_AUTH_PASSWORD</code> in <code>.env</code>.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <form action={refreshAction}>
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={refreshPending}
            >
              {refreshPending ? "Refreshing…" : "Refresh tokens"}
            </Button>
          </form>

          <form action={logoutAction}>
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={logoutPending}
            >
              {logoutPending ? "Logging out…" : "Logout"}
            </Button>
          </form>

          {(refreshState?.message || logoutState?.message) && (
            <p role="status" className="text-xs text-muted-foreground">
              {refreshState?.message ?? logoutState?.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
