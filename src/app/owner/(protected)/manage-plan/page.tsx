import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { ManagePlanPanel } from "@/components/owner/billing/ManagePlanPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
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
      <PageHeader title="Manage plan" />
      <ManagePlanPanel />
    </PageShell>
  );
}
