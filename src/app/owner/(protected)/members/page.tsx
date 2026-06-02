import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { MembersExplorerClient } from "@/components/gym-owner/MembersExplorerClient";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Members | Gym owner",
};

export default async function OwnerMembersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  return (
    <PageShell className="pb-20 md:pb-6">
      <PageHeader
        title="Members"
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
      <Suspense
        fallback={
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading members...</p>
          </div>
        }
      >
        <MembersExplorerClient />
      </Suspense>
    </PageShell>
  );
}
