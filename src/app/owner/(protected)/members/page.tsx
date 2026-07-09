import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { MembersExplorerClient } from "@/components/gym-owner/MembersExplorerClient";
import { PageShell } from "@/components/shared/PageShell";
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
    <PageShell className="h-screen overflow-hidden">
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
