import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { MembershipPlansManager } from "@/components/gym-owner/MembershipPlansManager";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageShell } from "@/components/shared/PageShell";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Duration pricing | Gym owner",
};

export default async function OwnerPricingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    redirect("/login");
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background px-4 pt-4">
      <div className="shrink-0 pb-4">
        <PageHeader
          subtitle="Membership"
          title="Pricing Plans"
          description="Create named plans with benefits and duration pricing"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#d4ff00]" />
              <p className="text-sm text-muted-foreground">Loading your prices…</p>
            </div>
          }
        >
          <MembershipPlansManager />
        </Suspense>
      </div>
    </div>
  );
}
