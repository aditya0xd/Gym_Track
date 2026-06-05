import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Sign in",
  description: "Gym owners and superadmin sign in.",
};

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session && !session.user.accountInvalid) {
    if (session.user.role === "superadmin") {
      redirect("/superadmin/gym-owners");
    } else {
      redirect("/owner/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-10">
      {/*
        Suspense is required here because LoginForm calls useSearchParams()
        to read the ?callbackUrl= param set by the proxy on unauthenticated access.
        Without this boundary Next.js throws during server rendering.
      */}
      <Suspense
        fallback={
          <div className="w-full max-w-md animate-pulse rounded-xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-6 h-6 w-24 rounded bg-muted" />
            <div className="space-y-3">
              <div className="h-10 rounded bg-muted" />
              <div className="h-10 rounded bg-muted" />
              <div className="h-10 rounded bg-muted" />
            </div>
          </div>
        }
      >
        <LoginForm className="w-full max-w-md shadow-sm" />
      </Suspense>
    </main>
  );
}
