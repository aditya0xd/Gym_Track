import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Sign in",
  description: "Gym owners and superadmin sign in.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-10">
      <LoginForm className="w-full max-w-md shadow-sm" />
    </main>
  );
}
