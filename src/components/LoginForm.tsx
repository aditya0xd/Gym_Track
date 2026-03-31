"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, signIn, signOut } from "next-auth/react";

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
import { cn } from "@/lib/utils";

type AuthState = {
  success: boolean;
  message: string;
} | null;

type LoginFormProps = {
  className?: string;
};

export default function LoginForm({ className }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginPending, setLoginPending] = useState(false);
  const [signupPending, setSignupPending] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [loginState, setLoginState] = useState<AuthState>(null);
  const [signupState, setSignupState] = useState<AuthState>(null);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginPending(true);
    setLoginState(null);

    const formData = new FormData(event.currentTarget);
    const email =
      typeof formData.get("email") === "string"
        ? String(formData.get("email")).toLowerCase().trim()
        : "";
    const password =
      typeof formData.get("password") === "string"
        ? String(formData.get("password"))
        : "";

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setLoginState({ success: false, message: "Invalid email or password." });
      setLoginPending(false);
      return;
    }

    const session = await getSession();
    const role = session?.user?.role;
    if (role === "superadmin") {
      router.push("/superadmin/gym-owners");
    } else {
      router.push("/owner/dashboard");
    }
    router.refresh();
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupPending(true);
    setSignupState(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").toLowerCase().trim(),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSignupState({
        success: false,
        message: data.message ?? "Unable to create account.",
      });
      setSignupPending(false);
      return;
    }

    const result = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });

    if (!result || result.error) {
      setSignupState({
        success: true,
        message: "Account created. Please login with your new credentials.",
      });
      setMode("login");
      setSignupPending(false);
      return;
    }

    router.push("/owner/dashboard");
    router.refresh();
  }

  async function handleLogout() {
    setLogoutPending(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Gym owners and platform superadmin use the same login. New gyms can
          register below.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "login" ? "default" : "outline"}
            onClick={() => setMode("login")}
          >
            Login
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "outline"}
            onClick={() => setMode("signup")}
          >
            Signup
          </Button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
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
                placeholder="********"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loginPending}>
              {loginPending ? "Signing in..." : "Sign in"}
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
        ) : (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Gym owner name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="owner@gym.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Min 8 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repeat password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={signupPending}>
              {signupPending ? "Creating account..." : "Create gym owner account"}
            </Button>

            {signupState?.message ? (
              <p
                role="status"
                className={cn(
                  "text-sm",
                  signupState.success ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {signupState.message}
              </p>
            ) : null}
          </form>
        )}

        <div className="flex flex-col gap-2 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={logoutPending}
            onClick={handleLogout}
          >
            {logoutPending ? "Logging out..." : "Logout"}
          </Button>

          <p className="text-center text-xs text-slate-500">
            <Link href="/" className="text-slate-400 hover:underline">
              Home
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
