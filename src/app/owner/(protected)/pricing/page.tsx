import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { DurationPricingForm } from "@/components/gym-owner/DurationPricingForm";
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
    <PageShell>
      <PageHeader
        subtitle="Membership"
        title="Pricing Plans"
        description="Manage the plans your gym offers"
      />
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#d4ff00]" />
            <p className="text-sm text-muted-foreground">Loading your prices…</p>
          </div>
        }
      >
        <DurationPricingForm />
      </Suspense>
    </PageShell>
  );
}
