"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  className?: string;
};

export default function LoginForm({ className }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginPending, setLoginPending] = useState(false);
  const [signupPending, setSignupPending] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // After login, navigate to callbackUrl (set by proxy for protected routes)
  // or fall back to "/" which lets the root page handle role-based routing.
  // Use window.location.href (hard navigation) so the browser always sends
  // the freshly-set session cookie on the next server request — fixes the
  // "too many redirects" loop on mobile where soft navigation can race.
  function navigateAfterLogin() {
    const callbackUrl = searchParams.get("callbackUrl") ?? "/";
    // Only allow same-origin callbackUrls to prevent open redirects
    const destination =
      callbackUrl.startsWith("/") &&
      !callbackUrl.startsWith("//") &&
      !callbackUrl.startsWith("/\\")
        ? callbackUrl
        : "/";
    window.location.href = destination;
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginPending(true);

    const formData = new FormData(event.currentTarget);
    const email =
      typeof formData.get("email") === "string"
        ? String(formData.get("email")).toLowerCase().trim()
        : "";
    const password =
      typeof formData.get("password") === "string"
        ? String(formData.get("password"))
        : "";
    const rememberMe = formData.get("rememberMe") === "on";

    // First check credentials without redirecting
    const result = await signIn("credentials", {
      email,
      password,
      rememberMe: rememberMe ? "true" : "false",
      redirect: false,
    });

    if (!result || result.error) {
      toast.error("Invalid email or password.");
      setLoginPending(false);
      return;
    }

    // Login successful — hard-navigate so the fresh cookie is sent to the server
    toast.success("Signed in successfully.");
    navigateAfterLogin();
    // Note: setLoginPending(false) intentionally omitted — the page is navigating away
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupPending(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .toLowerCase()
        .trim(),
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
      toast.error(data.message ?? "Unable to create account.");
      setSignupPending(false);
      return;
    }

    const result = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });

    if (!result || result.error) {
      toast.success("Account created. Sign in with your new credentials.");
      setMode("login");
      setSignupPending(false);
      return;
    }

    toast.success("Welcome! Your gym owner account is ready.");
    navigateAfterLogin();
    // Note: setSignupPending(false) intentionally omitted — the page is navigating away
  }

  return (
    <Card className={cn("w-full min-w-0 max-w-md border-border", className)}>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        {/* <CardDescription>
          Gym owners and platform superadmin use the same login. New gyms can
          register below.
        </CardDescription> */}
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
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showLoginPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="********"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showLoginPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="size-4 rounded border-input accent-black"
              />
              Remember me
            </label>

            <Button type="submit" className="w-full" disabled={loginPending}>
              {loginPending ? "Signing in..." : "Sign in"}
            </Button>
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
              <div className="relative">
                <Input
                  id="signup-password"
                  name="password"
                  type={showSignupPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSignupPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={signupPending}>
              {signupPending
                ? "Creating account..."
                : "Create gym owner account"}
            </Button>
          </form>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {/* <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={logoutPending}
            onClick={handleLogout}
          >
            {logoutPending ? "Logging out..." : "Logout"}
          </Button> */}

          <p className="text-center text-xs text-muted-foreground">
            For demo purposes: <br /> email: <code>seed-admin@gym.local</code>, password: <code>GymPass123!</code> 
            {/* <Link href="/" className="text-foreground underline-offset-4 hover:underline">
              Home
            </Link> */}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
