import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

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
      <OwnerMainNav email={session.user.email ?? ""} />
      {children}
    </div>
  );
}
