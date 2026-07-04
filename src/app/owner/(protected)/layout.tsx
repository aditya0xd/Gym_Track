import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { Plus } from "lucide-react";

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
      <OwnerMainNav />
      <div className="pb-16 md:pb-0">{children}</div>
      <Link
        href="/owner/members/new"
        className="fixed bottom-20 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#d4ff00] text-black shadow-lg shadow-black/40 hover:scale-105 active:scale-95 transition-all md:hidden"
        aria-label="Enroll member"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </Link>
      <OwnerBottomNav />
    </div>
  );
}

