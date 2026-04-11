import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { MemberBulkPanel } from "@/components/gym-owner/MemberBulkPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Bulk import / export | Gym owner",
};

export default async function OwnerMembersBulkPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  return (
    <PageShell className="pb-20 md:pb-6">
      <PageHeader
        title="Bulk import / export"
        description="Download members as CSV or upload new members from a spreadsheet."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/owner/members">Back to members</Link>
          </Button>
        }
      />
      <MemberBulkPanel />
    </PageShell>
  );
}
