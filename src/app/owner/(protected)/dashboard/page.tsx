import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { MembersDataTable } from "@/components/gym-owner/MembersDataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { listMembersForOwner } from "@/server/gym-owner/member.service";

export const metadata = {
  title: "Members | Gym owner",
};

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  const members = await listMembersForOwner(session.user.id);
  const rows = members.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    email: m.email,
    phone: m.phone,
    billingDuration: m.billingDuration,
    planPrice: m.planPrice.toString(),
    startDate: m.startDate.toISOString().slice(0, 10),
    endDate: m.endDate.toISOString().slice(0, 10),
    whatsappEnabled: m.whatsappEnabled,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Members"
        description={`Signed in as ${session.user.email ?? ""}`}
        actions={
          <Button asChild>
            <Link href="/owner/members/new">Enroll member</Link>
          </Button>
        }
      />
      <MembersDataTable members={rows} />
    </PageShell>
  );
}
