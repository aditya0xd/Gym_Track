import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { MembersExplorerPanel } from "@/components/gym-owner/MembersExplorerPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { listMembersForOwner } from "@/server/gym-owner/member.service";

export const metadata = {
  title: "Members | Gym owner",
};

export default async function OwnerMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  const members = await listMembersForOwner(session.user.id);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in7Days = new Date(today);
  in7Days.setUTCDate(in7Days.getUTCDate() + 7);

  const params = await searchParams;
  const status = (params.status ?? "all").toLowerCase();
  const filteredMembers = members.filter((m) => {
    if (status === "active") {
      return m.endDate >= today && m.membershipStatus === "ACTIVE";
    }
    if (status === "expiring") {
      return (
        m.endDate >= today &&
        m.endDate <= in7Days &&
        m.membershipStatus === "ACTIVE"
      );
    }
    if (status === "expired") return m.endDate < today;
    if (status === "paused") return m.membershipStatus === "PAUSED";
    return true;
  });

  const explorerMembers = filteredMembers.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    phone: m.phone,
    billingDuration: m.billingDuration,
    planPrice: m.planPrice.toString(),
    discountInr: m.discountInr.toString(),
    endDate: m.endDate.toISOString().slice(0, 10),
    membershipStatus: m.membershipStatus,
  }));

  return (
    <PageShell className="pb-20 md:pb-6">
      <PageHeader
        title="Members"
        // description={`Filter: ${status} · Signed in as ${session.user.email ?? ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/owner/members/bulk">Bulk CSV</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/owner/members/new">Enroll member</Link>
            </Button>
          </div>
        }
      />
      <MembersExplorerPanel members={explorerMembers} />
    </PageShell>
  );
}
