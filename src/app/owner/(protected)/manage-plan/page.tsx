import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { ManagePlanPanel } from "@/components/gym-owner/ManagePlanPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Manage plan | Gym owner",
};

export default async function OwnerManagePlanPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  return (
    <PageShell>
      <PageHeader
        title="Manage plan"
        description="Upgrade or downgrade plan, review billing details, and pay pending invoices."
      />
      <ManagePlanPanel />
    </PageShell>
  );
}
