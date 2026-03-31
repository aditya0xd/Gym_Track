import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SuperAdminMainNav } from "@/components/superadmin/SuperAdminMainNav";
import { authOptions } from "@/lib/auth";

export default async function SuperAdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "superadmin") {
    redirect("/login");
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <SuperAdminMainNav email={session.user.email ?? ""} />
      {children}
    </div>
  );
}
