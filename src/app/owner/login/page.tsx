import Link from "next/link";

import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Gym owner login",
  description: "Sign in to manage members and INR duration pricing.",
};

export default function OwnerLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-10 text-slate-100">
      <LoginForm className="w-full max-w-md" />
      <p className="mt-6 text-center text-xs text-slate-500">
        New here? After signup, set your four duration prices, then enroll members.
      </p>
      <p className="mt-2 text-center text-xs text-slate-500">
        <Link href="/" className="text-slate-400 hover:underline">
          Home
        </Link>
      </p>
    </main>
  );
}
