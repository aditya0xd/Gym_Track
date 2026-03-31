import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GymOwnersAdminPanel } from "@/components/superadmin/GymOwnersAdminPanel";
import { PlatformPricingAdminPanel } from "@/components/superadmin/PlatformPricingAdminPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
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
    <PageShell>
      <PageHeader
        title="Gym owners"
        description="Subscription: trial, starter, or pro. Adjust trial end for extensions."
      />
      <div className="space-y-4">
        <PlatformPricingAdminPanel />
        <GymOwnersAdminPanel />
      </div>
    </PageShell>
  );
}
