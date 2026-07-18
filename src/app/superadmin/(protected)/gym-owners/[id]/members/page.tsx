import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageShell } from "@/components/layout/PageShell";
import { SuperAdminMembersTable } from "@/components/superadmin/SuperAdminMembersTable";
import { SuperAdminAddMemberDialog } from "@/components/superadmin/SuperAdminAddMemberDialog";
import { SuperAdminCsvUploadDialog } from "@/components/superadmin/SuperAdminCsvUploadDialog";

export const metadata = {
  title: "Manage Gym Members | Superadmin",
};

export default async function SuperAdminManageMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "superadmin") {
    redirect("/login");
  }

  const owner = await prisma.adminUser.findUnique({
    where: { id, deletedAt: null },
  });

  if (!owner) {
    return (
      <PageShell>
        <div className="py-20 text-center text-zinc-400">Gym owner not found.</div>
      </PageShell>
    );
  }

  const members = await prisma.member.findMany({
    where: { adminUserId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      billingDuration: true,
      planPrice: true,
      startDate: true,
      endDate: true,
      membershipStatus: true,
    },
  });

  const formattedMembers = members.map(m => ({
    ...m,
    planPrice: m.planPrice.toString(),
    startDate: m.startDate.toISOString(),
    endDate: m.endDate.toISOString(),
  }));

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/superadmin/gym-owners"
            className="mb-4 flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Gym Owners
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">
            Manage Members
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Managing members for <span className="font-bold text-white">{owner.name}</span>
          </p>
        </div>

        <div className="flex gap-3">
          <SuperAdminCsvUploadDialog ownerId={owner.id} ownerName={owner.name} />
          <SuperAdminAddMemberDialog ownerId={owner.id} ownerName={owner.name} />
        </div>
      </div>

      <SuperAdminMembersTable ownerId={owner.id} initialMembers={formattedMembers} />
    </PageShell>
  );
}
