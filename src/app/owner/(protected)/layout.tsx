import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { OwnerBottomNav } from "@/components/gym-owner/OwnerBottomNav";
import { OwnerMainNav } from "@/components/gym-owner/OwnerMainNav";
import { authOptions } from "@/lib/auth";

export default async function OwnerProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="hidden md:block">
        <OwnerMainNav />
      </div>
      <div className="pb-16 md:pb-0 overflow-y-auto">{children}</div>
      <OwnerBottomNav />
    </div>
  );
}
