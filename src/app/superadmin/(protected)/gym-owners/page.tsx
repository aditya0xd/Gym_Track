import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GymOwnersAdminPanel } from "@/components/superadmin/GymOwnersAdminPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Gym owners | Superadmin",
};

export default async function SuperAdminGymOwnersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "superadmin") {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <PageHeader
        title="Gym owners"
        description="Subscription: trial, starter, or pro. Adjust trial end for extensions."
      />
      <GymOwnersAdminPanel />
    </div>
  );
}
