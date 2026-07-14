import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  if (session.user.onboardingComplete) {
    redirect("/owner/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#1F1F1F] text-foreground flex flex-col justify-center items-center">
      {children}
    </div>
  );
}
